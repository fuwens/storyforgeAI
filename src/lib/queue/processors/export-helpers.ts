import type { Shot } from "@/lib/types";

type FullProject = {
  scriptVersions: { version: number; content: string }[];
  shots: Shot[];
  [key: string]: unknown;
};

function getLatestScript(project: FullProject) {
  if (project.scriptVersions.length === 0) return null;
  return project.scriptVersions.reduce((a, b) =>
    a.version > b.version ? a : b,
  );
}

function getShotAssetUrl(shot: Shot): string {
  const approved = shot.assets.find((a) => a.approved);
  if (approved) return approved.storageUrl || approved.sourceUrl;
  if (shot.assets.length > 0) {
    const latest = shot.assets[shot.assets.length - 1];
    return latest.storageUrl || latest.sourceUrl;
  }
  return "";
}

function getActivePrompt(shot: Shot) {
  const active = shot.promptVariants.find((p) => p.isActive);
  return active || shot.promptVariants[0] || null;
}

function csvEscape(value: string) {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

export function buildCsv(project: FullProject) {
  const BOM = "\uFEFF";
  const header = [
    "Shot序号",
    "标题",
    "场景描述",
    "旁白",
    "情绪",
    "镜头类型",
    "时长",
    "素材URL",
    "Image Prompt",
    "Video Prompt",
  ].join(",");

  const rows = [header];
  for (const shot of project.shots) {
    const url = getShotAssetUrl(shot);
    const prompt = getActivePrompt(shot);
    rows.push(
      [
        shot.sequence,
        csvEscape(shot.title),
        csvEscape(shot.sceneDescription),
        csvEscape(shot.narration),
        csvEscape(shot.emotion),
        csvEscape(shot.shotType),
        shot.durationSeconds,
        csvEscape(url),
        csvEscape(prompt?.imagePrompt || ""),
        csvEscape(prompt?.videoPrompt || ""),
      ].join(","),
    );
  }

  return BOM + rows.join("\n");
}

export function buildTxt(project: FullProject) {
  const latestScript = getLatestScript(project);
  return latestScript?.content || "";
}
