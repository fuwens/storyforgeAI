import OpenAI from "openai";

import {
  buildMockPrompts,
  buildMockScript,
  buildMockStoryboard,
  buildPromptPrompt,
  buildScriptSystemPrompt,
  buildStoryboardPrompt,
} from "@/lib/ai/prompt-builders";

const client =
  process.env.TOAPIS_KEY && process.env.TOAPIS_BASE_URL
    ? new OpenAI({
        apiKey: process.env.TOAPIS_KEY,
        baseURL: process.env.TOAPIS_BASE_URL,
      })
    : null;

function parseJson<T>(value: string): T {
  const cleaned = value.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function generateScript(args: {
  topic: string;
  targetDuration: string;
  language: string;
  styleTags: string[];
  platform: string;
}) {
  if (!client) {
    return buildMockScript(args);
  }

  const response = await client.chat.completions.create({
    model: "claude-sonnet-4-6",
    messages: [
      { role: "system", content: buildScriptSystemPrompt(args) },
      { role: "user", content: `主题：${args.topic}` },
    ],
  });

  return response.choices[0]?.message.content?.trim() || buildMockScript(args);
}

export async function generateStoryboard(script: string) {
  if (!client) {
    return buildMockStoryboard(script);
  }

  const response = await client.chat.completions.create({
    model: "claude-sonnet-4-6",
    messages: [
      { role: "system", content: "你是一个只输出 JSON 的分镜编排助手。不要输出任何解释，只输出 JSON。" },
      { role: "user", content: buildStoryboardPrompt(script) },
    ],
  });

  const content = response.choices[0]?.message.content?.trim();
  if (!content) return buildMockStoryboard(script);
  const parsed = parseJson<{ shots?: ReturnType<typeof buildMockStoryboard> } | ReturnType<typeof buildMockStoryboard>>(content);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return parsed.shots ?? buildMockStoryboard(script);
}

export async function generatePrompts(scene: {
  sceneDescription: string;
  emotion: string;
  shotType: string;
  styleTags: string[];
}) {
  if (!client) {
    return buildMockPrompts(scene);
  }

  const response = await client.chat.completions.create({
    model: "claude-sonnet-4-6",
    messages: [
      { role: "system", content: "你是一个只输出 JSON 的视觉提示词专家。不要输出任何解释，只输出 JSON。" },
      { role: "user", content: buildPromptPrompt(scene) },
    ],
  });

  const content = response.choices[0]?.message.content?.trim();
  if (!content) return buildMockPrompts(scene);
  return parseJson<ReturnType<typeof buildMockPrompts>>(content);
}
