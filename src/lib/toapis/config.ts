import { ProjectPreset } from "@/lib/types";

export const projectPresets: ProjectPreset[] = [
  {
    key: "things-explainer",
    label: "Things I Had to Understand",
    description: "偏 faceless 解说、哲思叙述、抽象隐喻镜头。",
    styleTags: ["cinematic", "thoughtful", "faceless", "editorial"],
    defaultImageModel: "gpt-4o-image",
    defaultVideoModel: "kling-2-6",
  },
  {
    key: "story-essay",
    label: "故事感视频随笔",
    description: "更强调氛围、叙述感和视觉统一。",
    styleTags: ["moody", "film-grain", "symbolic", "minimal"],
    defaultImageModel: "seedream-5.0",
    defaultVideoModel: "sora-2",
  },
];

export const imageModels = [
  {
    id: "gpt-4o-image",
    label: "GPT-4o Image",
    aspectRatios: ["1:1", "2:3", "3:2"],
    defaults: { size: "3:2" },
  },
  {
    id: "gemini-3-pro-image",
    label: "Gemini 3 Pro Image",
    aspectRatios: ["1:1", "2:3", "3:2"],
    defaults: { size: "3:2" },
  },
  {
    id: "seedream-5.0",
    label: "Seedream 5.0",
    aspectRatios: ["1:1", "2:3", "3:2"],
    defaults: { size: "3:2" },
  },
];

export const videoModels = [
  {
    id: "kling-2-6",
    label: "Kling 2.6",
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    configFields: ["mode", "audio"],
    defaults: { mode: "std", audio: false, duration: 5, aspectRatio: "16:9" },
  },
  {
    id: "sora-2",
    label: "Sora 2",
    durations: [10, 15],
    aspectRatios: ["16:9", "9:16"],
    configFields: ["style", "n"],
    defaults: { duration: 10, aspectRatio: "16:9", style: "news", n: 1 },
  },
  {
    id: "sora-2-pro",
    label: "Sora 2 Pro",
    durations: [15, 25],
    aspectRatios: ["16:9", "9:16"],
    configFields: ["style", "n", "hd"],
    defaults: { duration: 15, aspectRatio: "16:9", style: "news", n: 1, hd: false },
  },
  {
    id: "veo3.1-fast",
    label: "Veo 3.1 Fast",
    durations: [8],
    aspectRatios: ["16:9", "9:16"],
    configFields: ["resolution"],
    defaults: { duration: 8, aspectRatio: "16:9", resolution: "720p" },
  },
  {
    id: "veo3.1-quality",
    label: "Veo 3.1 Quality",
    durations: [8],
    aspectRatios: ["16:9", "9:16"],
    configFields: ["resolution"],
    defaults: { duration: 8, aspectRatio: "16:9", resolution: "1080p" },
  },
];

export function getPreset(key: string) {
  return projectPresets.find((preset) => preset.key === key) ?? projectPresets[0];
}

export function getImageModel(id: string) {
  return imageModels.find((model) => model.id === id) ?? imageModels[0];
}

export function getVideoModel(id: string) {
  return videoModels.find((model) => model.id === id) ?? videoModels[0];
}
