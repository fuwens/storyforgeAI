import { uid } from "@/lib/utils";

const baseUrl = process.env.TOAPIS_BASE_URL || "https://toapis.com/v1";

// ToAPIs 图像生成是同步的，直接返回图片 URL，不走任务轮询
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
      resultUrl: undefined as string | undefined,
    };
  }

  // 把比例转成 ToAPIs 支持的 size 格式
  const size = aspectRatioToSize(input.aspectRatio || "3:2");

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TOAPIS_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      size,
      n: 1,
    }),
  });

  const data = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to generate image");
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("No image URL returned from ToAPIs");
  }

  // 图像是同步的，直接以 completed 状态返回
  return {
    provider: "toapis" as const,
    providerTaskId: imageUrl,
    status: "completed" as const,
    resultUrl: imageUrl,
  };
}

// 图像是同步的，不需要轮询
export async function getImageTaskStatus(taskId: string) {
  return {
    status: "completed",
    result: {
      data: [{ url: taskId }],
    },
  };
}

function aspectRatioToSize(aspectRatio: string): string {
  const map: Record<string, string> = {
    "1:1": "1024x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "16:9": "1792x1024",
    "9:16": "1024x1792",
  };
  return map[aspectRatio] || "1536x1024";
}
