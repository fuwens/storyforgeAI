import fs from "node:fs/promises";
import path from "node:path";

import { slugify, uid } from "@/lib/utils";

function generatedDir() {
  return path.join(process.cwd(), "public", "generated");
}

function publicUrl(fileName: string) {
  return `/generated/${fileName}`;
}

export async function persistMockAsset(
  prompt: string,
  mediaType: "image" | "video",
  model: string,
) {
  const safeName = `${slugify(prompt).slice(0, 30) || "asset"}-${uid(mediaType)}`;

  if (mediaType === "image") {
    const fileName = `${safeName}.svg`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
      <rect width="100%" height="100%" fill="#101726" />
      <rect x="48" y="48" width="1184" height="624" rx="28" fill="#1c2740" stroke="#8aa4ff" stroke-width="2" />
      <text x="72" y="128" fill="#8aa4ff" font-size="28" font-family="Helvetica, Arial, sans-serif">${escapeXml(model)}</text>
      <text x="72" y="200" fill="#ffffff" font-size="48" font-family="Helvetica, Arial, sans-serif">StoryForge Mock Render</text>
      <foreignObject x="72" y="250" width="1120" height="330">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Helvetica, Arial, sans-serif;color:#dbe5ff;font-size:28px;line-height:1.45;">
          ${escapeHtml(prompt)}
        </div>
      </foreignObject>
    </svg>`;
    await fs.writeFile(path.join(generatedDir(), fileName), svg, "utf8");
    return { sourceUrl: publicUrl(fileName), storageUrl: publicUrl(fileName), mimeType: "image/svg+xml" };
  }

  const fileName = `${safeName}.txt`;
  const content = `Mock video placeholder\nmodel=${model}\nprompt=${prompt}\n`;
  await fs.writeFile(path.join(generatedDir(), fileName), content, "utf8");
  return { sourceUrl: publicUrl(fileName), storageUrl: publicUrl(fileName), mimeType: "text/plain" };
}

export async function persistRemoteAsset(url: string, mediaType: "image" | "video") {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download remote asset: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || (mediaType === "image" ? "image/jpeg" : "video/mp4");
  const ext = inferExtension(mimeType, mediaType);
  const fileName = `${uid(mediaType)}.${ext}`;
  await fs.writeFile(path.join(generatedDir(), fileName), Buffer.from(arrayBuffer));

  return {
    sourceUrl: url,
    storageUrl: publicUrl(fileName),
    mimeType,
  };
}

function inferExtension(mimeType: string, mediaType: "image" | "video") {
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("mp4")) return "mp4";
  return mediaType === "image" ? "jpg" : "mp4";
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
