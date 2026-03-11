"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("workspace");

  const hasScript = Boolean(scriptDraft);
  const hasShots = project.shots.length > 0;
  const hasPrompts = project.shots.some((shot) => shot.promptVariants.length > 0);
  const hasAssets = project.shots.some((shot) => shot.assets.length > 0);
  const hasActiveTasks = project.shots.some((shot) =>
    shot.tasks.some((task) => task.status === "queued" || task.status === "in_progress"),
  );

  const activeStep = useMemo(() => {
    if (!hasScript) return 1;
    if (!hasShots) return 2;
    if (!hasPrompts) return 3;
    if (!hasAssets) return 5;
    return 6;
  }, [hasScript, hasShots, hasPrompts, hasAssets]);

  const [currentStep, setCurrentStep] = useState(activeStep);

  const refreshProject = useCallback(
    async (syncTasks = false) => {
      const url = syncTasks ? `/api/projects/${project.id}/tasks` : `/api/projects/${project.id}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === 401) { alert(t("authExpired")); window.location.href = "/login"; return; }
      if (!response.ok) return;
      const nextProject = (await response.json()) as Project;
      setProject(nextProject);
      setScriptDraft(nextProject.scriptVersions[0]?.content || "");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project.id],
  );

  useEffect(() => {
    if (!hasActiveTasks) return;
    const timer = window.setInterval(() => {
      void refreshProject(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [hasActiveTasks, refreshProject]);

  function handleUnauthorized() {
    alert(t("authExpired"));
    window.location.href = "/login";
  }

  async function runAction(action: string, request: () => Promise<Response>) {
    setLoadingAction(action);
    const response = await request();
    setLoadingAction(null);
    if (response.status === 401) { handleUnauthorized(); return; }
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

  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(
    () => new Set(initialProject.shots.map((s) => s.id)),
  );

  // Keep selectedShotIds in sync when shots change (new shots added, etc.)
  useEffect(() => {
    setSelectedShotIds((prev) => {
      const currentIds = new Set(project.shots.map((s) => s.id));
      const next = new Set(prev);
      // Add any new shots as selected by default
      for (const id of currentIds) {
        if (!next.has(id)) next.add(id);
      }
      // Remove any shots that no longer exist
      for (const id of next) {
        if (!currentIds.has(id)) next.delete(id);
      }
      return next;
    });
  }, [project.shots]);

  async function handleApprove(assetId: string) {
    const response = await fetch(`/api/assets/${assetId}/approve`, { method: "PUT" });
    if (response.status === 401) { handleUnauthorized(); return; }
    if (!response.ok) return;
    const nextProject = (await response.json()) as Project;
    setProject(nextProject);
  }

  async function handleRetry(taskId: string) {
    setRetryingTaskId(taskId);
    const response = await fetch(`/api/tasks/${taskId}/retry`, { method: "POST" });
    setRetryingTaskId(null);
    if (response.status === 401) { handleUnauthorized(); return; }
    if (!response.ok) return;
    await refreshProject(true);
  }

  // Restore in-progress ZIP export after page refresh
  useEffect(() => {
    const storageKey = `zip-job-${project.id}`;
    const savedJobId = localStorage.getItem(storageKey);
    if (!savedJobId) return;

    setLoadingAction("export-zip");
    const poll = setInterval(async () => {
      try {
        const jobRes = await fetch(`/api/jobs/${savedJobId}`);
        if (!jobRes.ok) { clearInterval(poll); setLoadingAction(null); localStorage.removeItem(storageKey); return; }
        const job = await jobRes.json();
        if (job.status === "completed" && job.result?.downloadUrl) {
          clearInterval(poll);
          setLoadingAction(null);
          localStorage.removeItem(storageKey);
          setExportLinks((current) => ({ ...current, zip: job.result.downloadUrl as string }));
          window.open(job.result.downloadUrl as string, "_blank");
          await refreshProject(false);
        } else if (job.status === "failed") {
          clearInterval(poll);
          setLoadingAction(null);
          localStorage.removeItem(storageKey);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function handleExport(format: "zip" | "csv" | "txt") {
    setLoadingAction(`export-${format}`);
    const shotIds = Array.from(selectedShotIds);
    const response = await fetch(`/api/projects/${project.id}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, shotIds }),
    });
    if (!response.ok) {
      setLoadingAction(null);
      return;
    }
    const payload = await response.json();

    if (format === "zip") {
      if (payload.downloadUrl && !payload.jobId) {
        setLoadingAction(null);
        setExportLinks((current) => ({ ...current, zip: payload.downloadUrl as string }));
        window.open(payload.downloadUrl as string, "_blank");
        return;
      }

      if (!payload.jobId) { setLoadingAction(null); return; }

      const jobId = payload.jobId as string;
      const storageKey = `zip-job-${project.id}`;
      localStorage.setItem(storageKey, jobId);

      const poll = setInterval(async () => {
        try {
          const jobRes = await fetch(`/api/jobs/${jobId}`);
          if (!jobRes.ok) return;
          const job = await jobRes.json();
          if (job.status === "completed" && job.result?.downloadUrl) {
            clearInterval(poll);
            setLoadingAction(null);
            localStorage.removeItem(storageKey);
            setExportLinks((current) => ({ ...current, zip: job.result.downloadUrl as string }));
            window.open(job.result.downloadUrl as string, "_blank");
            await refreshProject(false);
          } else if (job.status === "failed") {
            clearInterval(poll);
            setLoadingAction(null);
            localStorage.removeItem(storageKey);
            alert(`${t("exportFailed")}: ${job.error || t("unknownError")}`);
          }
        } catch {
          // ignore transient fetch errors
        }
      }, 3000);
      return;
    }

    setLoadingAction(null);
    if (payload.downloadUrl) {
      setProject(payload.project as Project);
      setExportLinks((current) => ({ ...current, [format]: payload.downloadUrl as string }));
    }
  }

  const TOTAL_STEPS = 7;
  const stepLabels = [
    t("step1"),
    t("step2"),
    t("step3"),
    t("step4"),
    t("step5"),
    t("step6"),
    t("step7"),
  ];

  const canGoNext: Record<number, boolean> = {
    1: true,
    2: hasScript,
    3: hasShots,
    4: hasPrompts,
    5: true,
    6: hasAssets,
    7: false,
  };

  function goNext() {
    if (currentStep < TOTAL_STEPS && canGoNext[currentStep]) {
      setCurrentStep((s) => s + 1);
    }
  }

  function goPrev() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  function canJumpTo(step: number) {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return hasScript;
    if (step === 4) return hasShots;
    if (step === 5) return hasPrompts;
    if (step === 6) return hasPrompts;
    if (step === 7) return hasAssets;
    return false;
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">{project.platform}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{project.title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{project.topic}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {project.styleTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">{t("targetDuration")}</p>
                  <p className="mt-1 text-white">{project.targetDuration}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">{t("language")}</p>
                  <p className="mt-1 text-white">{project.language}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-slate-500">{t("status")}</p>
                  <div className="mt-1"><StatusPill value={project.status} /></div>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{t("lastUpdated")} {formatDate(project.updatedAt)}</p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t("scriptTitle")}</h2>
              </div>
              <button
                className="rounded-full bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 cursor-pointer"
                onClick={handleGenerateScript}
                disabled={loadingAction === "script"}
              >
                {loadingAction === "script" ? t("generating") : scriptDraft ? t("regenerateScript") : t("generateScript")}
              </button>
            </div>
            <textarea
              rows={18}
              value={scriptDraft}
              onChange={(e) => setScriptDraft(e.target.value)}
              placeholder={t("scriptPlaceholder")}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200 placeholder:text-slate-600"
            />
            {!hasScript && (
              <p className="mt-3 text-xs text-amber-400">{t("scriptRequired")}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 3</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t("storyboardTitle")}</h2>
              </div>
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-60 cursor-pointer"
                onClick={handleGenerateStoryboard}
                disabled={loadingAction === "storyboard"}
              >
                {loadingAction === "storyboard" ? t("generating") : hasShots ? t("regenerateStoryboard") : t("generateStoryboard")}
              </button>
            </div>
            {hasShots ? (
              <div className="space-y-3">
                {project.shots.map((shot) => (
                  <div key={shot.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Shot {shot.sequence} · {shot.shotType} · {shot.emotion}</p>
                        <p className="mt-1 text-sm font-medium text-white">{shot.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{shot.sceneDescription}</p>
                        <p className="mt-1 text-xs text-slate-500">{shot.narration.slice(0, 80)}...</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs text-slate-400">{shot.durationSeconds}s</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-white/10 text-slate-500">
                {t("storyboardEmpty")}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 4</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t("promptTitle")}</h2>
              </div>
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-60 cursor-pointer"
                onClick={handleGeneratePrompts}
                disabled={loadingAction === "prompts"}
              >
                {loadingAction === "prompts" ? t("generating") : hasPrompts ? t("regeneratePrompts") : t("generatePrompts")}
              </button>
            </div>
            <div className="space-y-4">
              {project.shots.map((shot) => {
                const pv = shot.promptVariants[0];
                return (
                  <div key={shot.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-2 text-xs text-slate-500">Shot {shot.sequence} · {shot.sceneDescription.slice(0, 50)}...</p>
                    {pv ? (
                      <div className="space-y-2 text-xs leading-6 text-slate-400">
                        <div><span className="text-slate-500">Image: </span>{pv.imagePrompt}</div>
                        <div><span className="text-slate-500">Video: </span>{pv.videoPrompt}</div>
                        {pv.negativePrompt && <div><span className="text-slate-500">Negative: </span>{pv.negativePrompt}</div>}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">{t("noPrompt")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 5</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t("configTitle")}</h2>
              <p className="mt-1 text-sm text-slate-400">{t("configSubtitle")}</p>
            </div>
            <div className="space-y-4">
              {project.shots.map((shot) => {
                const currentImageModel = getImageModel(shot.model || imageModels[0].id);
                const currentVideoModel = getVideoModel(shot.model || videoModels[0].id);
                const activeModel = shot.generationType === "image" ? currentImageModel : currentVideoModel;
                return (
                  <div key={shot.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-3 text-sm font-medium text-white">Shot {shot.sequence} · {shot.title}</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2 text-xs text-slate-400">
                        {t("configType")}
                        <select
                          value={shot.generationType}
                          onChange={(e) => {
                            const nextType = e.target.value as Shot["generationType"];
                            const nextModel = nextType === "image" ? imageModels[0].id : videoModels[0].id;
                            handleShotUpdate(shot, {
                              generationType: nextType,
                              model: nextModel,
                              aspectRatio: nextType === "image" ? imageModels[0].defaults.size : videoModels[0].defaults.aspectRatio,
                              modelConfig: nextType === "image" ? {} : (videoModels[0].defaults as Record<string, unknown>),
                            });
                          }}
                          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs text-slate-400">
                        {t("configModel")}
                        <select
                          value={shot.model || (shot.generationType === "image" ? imageModels[0].id : videoModels[0].id)}
                          onChange={(e) => handleShotUpdate(shot, { model: e.target.value })}
                          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          {(shot.generationType === "image" ? imageModels : videoModels).map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs text-slate-400">
                        {t("configRatio")}
                        <select
                          value={shot.aspectRatio}
                          onChange={(e) => handleShotUpdate(shot, { aspectRatio: e.target.value })}
                          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          {activeModel.aspectRatios.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs text-slate-400">
                        {t("configDuration")}
                        <select
                          value={shot.durationSeconds}
                          onChange={(e) => handleShotUpdate(shot, { durationSeconds: Number(e.target.value) })}
                          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                        >
                          {(shot.generationType === "image" ? [shot.durationSeconds] : (currentVideoModel as typeof videoModels[0]).durations).map((d) => (
                            <option key={d} value={d}>{d}s</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 6</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{t("batchTitle")}</h2>
                </div>
                <button
                  className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 cursor-pointer"
                  onClick={handleSubmitTasks}
                  disabled={loadingAction === "tasks"}
                >
                  {loadingAction === "tasks" ? t("submitting") : t("startBatch")}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs text-slate-500">{t("totalShots")}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{project.shots.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs text-slate-500">{t("inProgress")}</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-300">
                    {project.shots.reduce((sum, shot) =>
                      sum + shot.tasks.filter((task) => task.status === "queued" || task.status === "in_progress").length, 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs text-slate-500">{t("completed")}</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-300">
                    {project.shots.reduce((sum, shot) => sum + shot.assets.length, 0)}
                  </p>
                </div>
              </div>
              {hasActiveTasks && (
                <p className="mt-4 text-xs text-indigo-300 animate-pulse">{t("generating_pulse")}</p>
              )}
              {hasAssets && !hasActiveTasks && (
                <p className="mt-4 text-xs text-emerald-400">{t("batchDone")}</p>
              )}
            </div>

            <div className="space-y-3">
              {project.shots.map((shot) => {
                const latestTask = shot.tasks[0];
                const hasAsset = shot.assets.length > 0;
                const isFailed = latestTask?.status === "failed";
                const isRunning = latestTask?.status === "queued" || latestTask?.status === "in_progress";
                return (
                  <div key={shot.id} className={[
                    "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3",
                    isFailed ? "border-rose-400/20 bg-rose-400/5" :
                    hasAsset ? "border-emerald-400/20 bg-emerald-400/5" :
                    isRunning ? "border-indigo-400/20 bg-indigo-400/5" :
                    "border-white/10 bg-white/5"
                  ].join(" ")}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">Shot {shot.sequence} · {shot.title}</p>
                      {isFailed && (
                        <p className="mt-0.5 text-xs text-rose-300">{latestTask.errorMessage || t("exportFailed")}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={[
                        "rounded-full px-2 py-1 text-xs font-medium",
                        isFailed ? "bg-rose-400/20 text-rose-300" :
                        hasAsset ? "bg-emerald-400/20 text-emerald-300" :
                        isRunning ? "bg-indigo-400/20 text-indigo-300" :
                        "bg-white/10 text-slate-400"
                      ].join(" ")}>
                        {isFailed ? t("failed") : hasAsset ? t("done") : isRunning ? t("inProgressStatus") : t("pending")}
                      </span>
                      {isFailed && latestTask && (
                        <button
                          onClick={() => handleRetry(latestTask.id)}
                          disabled={retryingTaskId === latestTask.id}
                          className="rounded-full border border-rose-400/30 px-3 py-1 text-xs text-rose-200 hover:bg-rose-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {retryingTaskId === latestTask.id ? t("retrying") : t("retry")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 7</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{t("reviewTitle")}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["zip", "csv", "txt"] as const).map((format) => (
                    <button
                      key={format}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-60 cursor-pointer"
                      onClick={() => handleExport(format)}
                      disabled={!!loadingAction}
                    >
                      {loadingAction === `export-${format}`
                        ? (format === "zip" ? t("exportZipPacking") : t("exporting"))
                        : `Export ${format.toUpperCase()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shot selection */}
              <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-white">{t("exportSelectShots")}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedShotIds(new Set(project.shots.map((s) => s.id)))}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {t("selectAll")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedShotIds(new Set())}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      {t("selectNone")}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {project.shots.map((shot) => {
                    const isChecked = selectedShotIds.has(shot.id);
                    const approvedAsset = shot.assets.find((a) => a.approved);
                    const anyAsset = shot.assets[0];
                    const thumbUrl = (approvedAsset ?? anyAsset)?.storageUrl || null;
                    return (
                      <label
                        key={shot.id}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition",
                          isChecked ? "border-indigo-400/30 bg-indigo-400/5" : "border-white/5 bg-white/5 opacity-60",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedShotIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(shot.id);
                              else next.delete(shot.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded accent-indigo-400"
                        />
                        {thumbUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt=""
                            className="h-8 w-14 rounded object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1 text-sm text-white truncate">
                          <span className="text-slate-400">Shot {shot.sequence} · </span>
                          {shot.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t("exportSelected", { count: selectedShotIds.size, total: project.shots.length })}
                </p>
              </div>

              {Object.entries(exportLinks).map(([format, url]) => (
                <a key={format} href={url} className="mb-3 block rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {t("downloadFile", { format: format.toUpperCase() })}
                </a>
              ))}
            </div>
            <div className="space-y-4">
              {project.shots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  onApprove={handleApprove}
                  onRetry={handleRetry}
                  retryingTaskId={retryingTaskId}
                  onPromptUpdated={() => refreshProject(false)}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部项目信息栏 */}
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{project.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{project.topic.slice(0, 60)}...</p>
          </div>
          <StatusPill value={project.status} />
        </div>
        {/* 步骤进度条（可点击跳转） */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {stepLabels.map((label, i) => {
            const step = i + 1;
            const isActive = step === currentStep;
            const isDone = step < currentStep;
            const isClickable = canJumpTo(step);
            return (
              <button
                key={step}
                onClick={() => isClickable && setCurrentStep(step)}
                disabled={!isClickable}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition",
                  isActive ? "bg-indigo-400 text-slate-950 font-semibold" :
                  isDone ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
                  isClickable ? "border border-white/10 text-slate-400 hover:border-white/20 hover:text-white cursor-pointer" :
                  "border border-white/5 text-slate-600 cursor-not-allowed",
                ].join(" ")}
              >
                <span className={[
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  isActive ? "bg-slate-950 text-indigo-400" :
                  isDone ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10",
                ].join(" ")}>
                  {isDone ? "✓" : step}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 当前步骤内容 */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* 底部导航按钮 */}
      <div className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/5 px-6 py-4">
        <button
          onClick={goPrev}
          disabled={currentStep === 1}
          className="rounded-full border border-white/10 px-5 py-2 text-sm text-white disabled:opacity-30 cursor-pointer"
        >
          {t("prevStep")}
        </button>
        <span className="text-xs text-slate-500">{currentStep} / {TOTAL_STEPS}</span>
        <button
          onClick={goNext}
          disabled={currentStep === TOTAL_STEPS || !canGoNext[currentStep]}
          className="rounded-full bg-indigo-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-30 cursor-pointer"
        >
          {t("nextStep")}
        </button>
      </div>
    </div>
  );
}
