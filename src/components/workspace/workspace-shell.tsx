"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ShotCard } from "@/components/shots/shot-card";
import { StatusPill } from "@/components/ui/status-pill";
import { StepNav } from "@/components/workspace/step-nav";
import { getImageModel, getVideoModel, imageModels, videoModels } from "@/lib/toapis/config";
import type { Project, Shot } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type WorkspaceShellProps = {
  initialProject: Project;
};

export function WorkspaceShell({ initialProject }: WorkspaceShellProps) {
  const [project, setProject] = useState(initialProject);
  const [scriptDraft, setScriptDraft] = useState(initialProject.scriptVersions[0]?.content || "");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [exportLinks, setExportLinks] = useState<Record<string, string>>({});

  const hasShots = project.shots.length > 0;
  const hasPrompts = project.shots.some((shot) => shot.promptVariants.length > 0);
  const hasAssets = project.shots.some((shot) => shot.assets.length > 0);
  const hasActiveTasks = project.shots.some((shot) =>
    shot.tasks.some((task) => task.status === "queued" || task.status === "in_progress"),
  );

  const activeStep = useMemo(() => {
    if (!scriptDraft) return 0;
    if (!hasShots) return 1;
    if (!hasPrompts) return 2;
    if (!hasAssets) return 4;
    return 6;
  }, [hasAssets, hasPrompts, hasShots, scriptDraft]);

  const refreshProject = useCallback(
    async (syncTasks = false) => {
      const url = syncTasks ? `/api/projects/${project.id}/tasks` : `/api/projects/${project.id}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return;
      const nextProject = (await response.json()) as Project;
      setProject(nextProject);
      setScriptDraft(nextProject.scriptVersions[0]?.content || "");
    },
    [project.id],
  );

  useEffect(() => {
    if (!hasActiveTasks) return;
    const timer = window.setInterval(() => {
      void refreshProject(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveTasks, refreshProject]);

  async function runAction(action: string, request: () => Promise<Response>) {
    setLoadingAction(action);
    const response = await request();
    setLoadingAction(null);
    if (!response.ok) return;
    const nextProject = (await response.json()) as Project;
    setProject(nextProject);
    setScriptDraft(nextProject.scriptVersions[0]?.content || "");
  }

  async function handleGenerateScript() {
    await runAction("script", () =>
      fetch(`/api/projects/${project.id}/generate-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptDraft }),
      }),
    );
  }

  async function handleGenerateStoryboard() {
    await runAction("storyboard", () =>
      fetch(`/api/projects/${project.id}/generate-storyboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptDraft }),
      }),
    );
  }

  async function handleGeneratePrompts() {
    await runAction("prompts", () =>
      fetch(`/api/projects/${project.id}/generate-prompts`, { method: "POST" }),
    );
  }

  async function handleSubmitTasks() {
    await runAction("tasks", () =>
      fetch(`/api/projects/${project.id}/tasks`, { method: "POST" }),
    );
  }

  async function handleShotUpdate(shot: Shot, patch: Partial<Shot>) {
    const response = await fetch(`/api/shots/${shot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, ...patch }),
    });
    if (!response.ok) return;
    const updated = (await response.json()) as Shot;
    setProject((current) => ({
      ...current,
      shots: current.shots.map((item) => (item.id === updated.id ? updated : item)),
    }));
  }

  async function handleApprove(assetId: string) {
    const response = await fetch(`/api/assets/${assetId}/approve`, { method: "PUT" });
    if (!response.ok) return;
    const nextProject = (await response.json()) as Project;
    setProject(nextProject);
  }

  async function handleRetry(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
    if (!response.ok) return;
    await refreshProject(true);
  }

  async function handleExport(format: "zip" | "csv" | "txt") {
    setLoadingAction(`export-${format}`);
    const response = await fetch(`/api/projects/${project.id}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });
    setLoadingAction(null);
    if (!response.ok) return;
    const payload = (await response.json()) as { downloadUrl: string; project: Project };
    setProject(payload.project);
    setExportLinks((current) => ({ ...current, [format]: payload.downloadUrl }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{project.platform}</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">{project.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{project.topic}</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-300">
            <StatusPill value={project.status} />
            <p>最近更新 {formatDate(project.updatedAt)}</p>
            <p>镜头数 {project.shots.length}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {project.styleTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-6">
          <StepNav activeStep={activeStep} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">脚本</h2>
              </div>
              <button
                className="rounded-full bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={handleGenerateScript}
              >
                {loadingAction === "script" ? "生成中..." : "生成脚本"}
              </button>
            </div>
            <textarea
              rows={14}
              value={scriptDraft}
              onChange={(event) => setScriptDraft(event.target.value)}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
            />
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 3 + 4</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">分镜与 Prompt</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                  onClick={handleGenerateStoryboard}
                >
                  {loadingAction === "storyboard" ? "生成中..." : "生成分镜"}
                </button>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                  onClick={handleGeneratePrompts}
                >
                  {loadingAction === "prompts" ? "生成中..." : "批量生成 Prompt"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {project.shots.map((shot) => {
                const currentImageModel = getImageModel(shot.model || imageModels[0].id);
                const currentVideoModel = getVideoModel(shot.model || videoModels[0].id);
                const activeModel = shot.generationType === "image" ? currentImageModel : currentVideoModel;

                return (
                  <div key={shot.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2 text-sm text-slate-300">
                        类型
                        <select
                          value={shot.generationType}
                          onChange={(event) => {
                            const nextType = event.target.value as Shot["generationType"];
                            const nextModel =
                              nextType === "image" ? imageModels[0].id : videoModels[0].id;
                            handleShotUpdate(shot, {
                              generationType: nextType,
                              model: nextModel,
                              aspectRatio:
                                nextType === "image"
                                  ? imageModels[0].defaults.size
                                  : videoModels[0].defaults.aspectRatio,
                              modelConfig:
                                nextType === "image" ? {} : (videoModels[0].defaults as Record<string, unknown>),
                            });
                          }}
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-300">
                        模型
                        <select
                          value={shot.model || (shot.generationType === "image" ? imageModels[0].id : videoModels[0].id)}
                          onChange={(event) =>
                            handleShotUpdate(shot, {
                              model: event.target.value,
                            })
                          }
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2"
                        >
                          {(shot.generationType === "image" ? imageModels : videoModels).map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-300">
                        比例
                        <select
                          value={shot.aspectRatio}
                          onChange={(event) => handleShotUpdate(shot, { aspectRatio: event.target.value })}
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2"
                        >
                          {activeModel.aspectRatios.map((ratio) => (
                            <option key={ratio} value={ratio}>
                              {ratio}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-300">
                        时长
                        <select
                          value={shot.durationSeconds}
                          onChange={(event) =>
                            handleShotUpdate(shot, { durationSeconds: Number(event.target.value) })
                          }
                          className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2"
                        >
                          {(shot.generationType === "image"
                            ? [shot.durationSeconds]
                            : currentVideoModel.durations
                          ).map((duration) => (
                            <option key={duration} value={duration}>
                              {duration}s
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-400">{shot.sceneDescription}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 5 + 6</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">批量任务</h2>
              </div>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                onClick={handleSubmitTasks}
              >
                {loadingAction === "tasks" ? "提交中..." : "开始批量生成"}
              </button>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-slate-500">总镜头</p>
                <p className="mt-2 text-3xl font-semibold text-white">{project.shots.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-slate-500">运行中</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {project.shots.reduce(
                    (sum, shot) =>
                      sum +
                      shot.tasks.filter(
                        (task) => task.status === "queued" || task.status === "in_progress",
                      ).length,
                    0,
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-slate-500">已回存素材</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {project.shots.reduce((sum, shot) => sum + shot.assets.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 7</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">审核与导出</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["zip", "csv", "txt"] as const).map((format) => (
                  <button
                    key={format}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                    onClick={() => handleExport(format)}
                  >
                    {loadingAction === `export-${format}` ? "导出中..." : `导出 ${format.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {Object.entries(exportLinks).map(([format, url]) => (
                <a
                  key={format}
                  href={url}
                  className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
                >
                  下载 {format.toUpperCase()} 文件
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {project.shots.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onApprove={handleApprove}
            onRetry={handleRetry}
            onPromptUpdated={() => refreshProject(false)}
          />
        ))}
      </section>
    </div>
  );
}
