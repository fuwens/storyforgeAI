import { uid } from "@/lib/utils";

const baseUrl = process.env.TOAPIS_BASE_URL || "https://toapis.com/v1";

export async function submitImageTask(input: {
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
}) {
  if (!process.env.TOAPIS_KEY) {
    return {
      provider: "mock" as const,
      providerTaskId: uid("mock_image"),
      status: "queued" as const,
    };
  }

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TOAPIS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      size: input.aspectRatio || "3:2",
      n: 1,
    }),
  });

  const data = (await response.json()) as { id: string; status: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to submit image task");
  }

  return {
    provider: "toapis" as const,
    providerTaskId: data.id,
    status: data.status as "queued" | "in_progress" | "completed" | "failed",
  };
}

export async function getImageTaskStatus(taskId: string) {
  const response = await fetch(`${baseUrl}/images/generations/${taskId}`, {
    headers: {
      Authorization: `Bearer ${process.env.TOAPIS_KEY}`,
    },
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String((data.error as { message?: string } | undefined)?.message || "Failed to poll image task"));
  }
  return data;
}
