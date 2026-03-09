"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { StatusPill } from "@/components/ui/status-pill";
import { projectPresets } from "@/lib/toapis/config";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ProjectDashboardProps = {
  initialProjects: Project[];
};

export function ProjectDashboard({ initialProjects }: ProjectDashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(false);
  const defaultPreset = useMemo(() => projectPresets[0], []);

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const styleTags = String(formData.get("styleTags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        topic: formData.get("topic"),
        targetDuration: formData.get("targetDuration"),
        language: formData.get("language"),
        platform: formData.get("platform"),
        presetKey: formData.get("presetKey"),
        styleTags,
      }),
    });

    setLoading(false);
    if (!response.ok) return;
    const project = (await response.json()) as Project;
    setProjects((current) => [project, ...current]);
    router.push(`/projects/${project.id}`);
  }

  async function handleDuplicate(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
    if (!response.ok) return;
    const project = (await response.json()) as Project;
    setProjects((current) => [project, ...current]);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">MVP Control Room</p>
            <h1 className="mt-3 text-4xl font-semibold text-white">新建创作项目</h1>
          </div>
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 cursor-pointer"
            onClick={handleLogout}
          >
            退出
          </button>
        </div>

        <form className="grid gap-4" onSubmit={handleCreateProject}>
          <input
            name="title"
            defaultValue="Things I Had to Understand - Episode 01"
            placeholder="项目标题"
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
          />
          <textarea
            name="topic"
            rows={5}
            defaultValue="为什么很多理解都来得太晚？我想做一个 faceless 叙述型视频，用安静、隐喻、略带不安的视觉讲这个主题。"
            className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <select
              name="presetKey"
              defaultValue={defaultPreset.key}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
            >
              {projectPresets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
            <input
              name="styleTags"
              defaultValue={defaultPreset.styleTags.join(", ")}
              className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <select name="targetDuration" defaultValue="60s" className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <option value="30s">30s</option>
              <option value="60s">60s</option>
              <option value="90s">90s</option>
              <option value="3min">3min</option>
            </select>
            <select name="language" defaultValue="English" className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <option value="English">English</option>
              <option value="中文">中文</option>
            </select>
            <select name="platform" defaultValue="YouTube" className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <option value="YouTube">YouTube</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram Reels">Instagram Reels</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-indigo-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "创建中..." : "创建项目并进入工作台"}
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Projects</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">最近项目</h2>
        </div>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-8 text-slate-400">
              还没有项目，先创建一个。
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{formatDate(project.updatedAt)}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{project.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{project.topic}</p>
                  </div>
                  <StatusPill value={project.status} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.styleTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/projects/${project.id}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                    打开工作台
                  </Link>
                  <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white cursor-pointer" onClick={() => handleDuplicate(project.id)}>
                    复制项目
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
