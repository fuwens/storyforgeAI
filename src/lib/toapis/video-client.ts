import { uid } from "@/lib/utils";

const baseUrl = process.env.TOAPIS_BASE_URL || "https://toapis.com/v1";

export async function submitVideoTask(input: {
  model: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  modelConfig?: Record<string, unknown>;
}) {
  if (!process.env.TOAPIS_KEY) {
    return {
      provider: "mock" as const,
      providerTaskId: uid("mock_video"),
      status: "queued" as const,
    };
  }

  const payload = buildPayload(input);
  const response = await fetch(`${baseUrl}/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TOAPIS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as { id: string; status: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to submit video task");
  }

  return {
    provider: "toapis" as const,
    providerTaskId: data.id,
    status: data.status as "queued" | "in_progress" | "completed" | "failed",
  };
}

export async function getVideoTaskStatus(taskId: string) {
  const response = await fetch(`${baseUrl}/videos/generations/${taskId}`, {
    headers: {
      Authorization: `Bearer ${process.env.TOAPIS_KEY}`,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String((data.error as { message?: string } | undefined)?.message || "Failed to poll video task"));
  }
  return data;
}

function buildPayload(input: {
  model: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
  modelConfig?: Record<string, unknown>;
}) {
  if (input.model.startsWith("veo3.1")) {
    return {
      model: input.model,
      prompt: input.prompt,
      duration: 8,
      aspect_ratio: input.aspectRatio || "16:9",
      metadata: {
        resolution: input.modelConfig?.resolution || "1080p",
      },
    };
  }

  if (input.model.startsWith("kling")) {
    // Kling 只支持 5s 和 10s，取最近合法值
    const rawDuration = input.duration || 5;
    const klingDuration = rawDuration <= 7 ? 5 : 10;
    return {
      model: input.model,
      prompt: input.prompt,
      duration: klingDuration,
      aspect_ratio: input.aspectRatio || "16:9",
      mode: input.modelConfig?.mode || "std",
      audio: Boolean(input.modelConfig?.audio),
    };
  }

  return {
    model: input.model,
    prompt: input.prompt,
    duration: input.duration || 10,
    aspect_ratio: input.aspectRatio || "16:9",
    metadata: {
      style: input.modelConfig?.style || "news",
      n: input.modelConfig?.n || 1,
      hd: Boolean(input.modelConfig?.hd),
    },
  };
}
