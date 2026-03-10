"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { StatusPill } from "@/components/ui/status-pill";
import type { Shot } from "@/lib/types";

type ShotCardProps = {
  shot: Shot;
  onApprove: (assetId: string) => void;
  onRetry: (taskId: string) => void;
  retryingTaskId?: string | null;
  onPromptUpdated?: () => void;
};

export function ShotCard({ shot, onApprove, onRetry, retryingTaskId, onPromptUpdated }: ShotCardProps) {
  const latestTask = shot.tasks[0];
  const approvedAsset = shot.assets.find((asset) => asset.approved);
  const activePrompt = shot.promptVariants[0];
  const t = useTranslations("shotCard");

  const [editingPrompt, setEditingPrompt] = useState(false);
  const [imagePrompt, setImagePrompt] = useState(activePrompt?.imagePrompt ?? "");
  const [videoPrompt, setVideoPrompt] = useState(activePrompt?.videoPrompt ?? "");
  const [negativePrompt, setNegativePrompt] = useState(activePrompt?.negativePrompt ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSavePrompt() {
    if (!activePrompt) return;
    setSaving(true);
    const response = await fetch(`/api/prompts/${activePrompt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePrompt, videoPrompt, negativePrompt }),
    });
    setSaving(false);
    if (response.ok) {
      setEditingPrompt(false);
      onPromptUpdated?.();
    }
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Shot {shot.sequence}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{shot.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill value={shot.generationType} />
          {latestTask ? <StatusPill value={latestTask.status} /> : null}
        </div>
      </div>

      <div className="space-y-3 text-sm leading-6 text-slate-300">
        <p>{shot.narration}</p>
        <p className="text-slate-400">{shot.sceneDescription}</p>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
        <p>
          <span className="text-slate-500">{t("model")}</span>
          {shot.model || t("modelUnset")}
        </p>
        <p>
          <span className="text-slate-500">{t("ratio")}</span>
          {shot.aspectRatio || "-"}
        </p>
        <p>
          <span className="text-slate-500">{t("emotion")}</span>
          {shot.emotion} / {shot.shotType}
        </p>
      </div>

      {activePrompt ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Prompts</p>
            <button
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 cursor-pointer"
              onClick={() => setEditingPrompt(!editingPrompt)}
            >
              {editingPrompt ? t("cancelPrompt") : t("editPrompt")}
            </button>
          </div>

          {editingPrompt ? (
            <div className="space-y-3">
              <label className="block space-y-1 text-xs text-slate-400">
                Image Prompt
                <textarea
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="block space-y-1 text-xs text-slate-400">
                Video Prompt
                <textarea
                  rows={3}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <label className="block space-y-1 text-xs text-slate-400">
                Negative Prompt
                <textarea
                  rows={2}
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                />
              </label>
              <button
                className="rounded-full bg-indigo-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60 cursor-pointer"
                disabled={saving}
                onClick={handleSavePrompt}
              >
                {saving ? t("saving") : t("savePrompt")}
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-xs leading-6 text-slate-400">
              <div>
                <span className="text-slate-500">Image: </span>
                {activePrompt.imagePrompt}
              </div>
              <div>
                <span className="text-slate-500">Video: </span>
                {activePrompt.videoPrompt}
              </div>
              {activePrompt.negativePrompt ? (
                <div>
                  <span className="text-slate-500">Negative: </span>
                  {activePrompt.negativePrompt}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {shot.assets.map((asset) => {
          const previewUrl = asset.storageUrl || asset.sourceUrl;
          const isVideo = asset.mimeType.startsWith("video/");
          const isImage = asset.mimeType.startsWith("image/");

          return (
            <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={shot.title}
                  className="h-40 w-full rounded-xl object-cover"
                />
              ) : isVideo ? (
                <video
                  src={previewUrl}
                  controls
                  className="h-40 w-full rounded-xl bg-black object-contain"
                  preload="metadata"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/60 text-center text-xs text-slate-400">
                  <a href={previewUrl} target="_blank" rel="noreferrer" className="text-indigo-300 underline">
                    {t("openFile")}
                  </a>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusPill value={asset.approved ? "completed" : "draft"} />
                <button
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white cursor-pointer"
                  onClick={() => onApprove(asset.id)}
                >
                  {asset.approved ? t("approved") : t("approve")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {latestTask?.status === "failed" ? (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          <span>{latestTask.errorMessage || t("taskFailed")}</span>
          <button
            className="rounded-full border border-white/10 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={retryingTaskId === latestTask.id}
            onClick={() => onRetry(latestTask.id)}
          >
            {retryingTaskId === latestTask.id ? t("retrying") : t("retry")}
          </button>
        </div>
      ) : null}

      {approvedAsset ? (
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-emerald-300">Approved Asset Ready</p>
      ) : null}
    </article>
  );
}
