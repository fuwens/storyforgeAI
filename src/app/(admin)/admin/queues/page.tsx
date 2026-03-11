"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type JobDetail = {
  id: string | undefined;
  name: string;
  status: string;
  data: Record<string, unknown>;
  failedReason: string | null;
  timestamp: number;
  processedOn: number | null;
  finishedOn: number | null;
};

type QueueStats = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  recentJobs: JobDetail[];
};

export default function AdminQueuesPage() {
  const t = useTranslations("adminQueues");
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchQueues = useCallback(async () => {
    const res = await fetch("/api/admin/queues");
    if (res.ok) {
      const data = (await res.json()) as QueueStats[];
      setQueues(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchQueues();
    const interval = setInterval(fetchQueues, 5000);
    return () => clearInterval(interval);
  }, [fetchQueues]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("badge")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="space-y-6">
          {queues.map((q) => (
            <div
              key={q.name}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white font-mono">{q.name}</h2>
                <button
                  onClick={() => setExpanded(expanded === q.name ? null : q.name)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {expanded === q.name ? t("hideJobs") : t("showJobs")}
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-5 gap-3 text-center">
                <StatBox label={t("waiting")} value={q.waiting} color="text-amber-300" />
                <StatBox label={t("active")} value={q.active} color="text-indigo-300" />
                <StatBox label={t("completed")} value={q.completed} color="text-emerald-300" />
                <StatBox label={t("failed")} value={q.failed} color="text-rose-300" />
                <StatBox label={t("delayed")} value={q.delayed} color="text-slate-300" />
              </div>

              {/* Recent jobs */}
              {expanded === q.name && q.recentJobs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-slate-500">{t("recentJobs")}</p>
                  {q.recentJobs.map((job, i) => (
                    <div
                      key={job.id ?? i}
                      className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono text-slate-400">#{job.id}</span>
                          <span className="ml-2 text-sm font-medium text-white">{job.name}</span>
                          {job.data.type ? (
                            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                              {String(job.data.type)}
                            </span>
                          ) : null}
                          {job.data.projectId ? (
                            <span className="ml-1 text-xs text-slate-500">
                              project: {String(job.data.projectId).slice(0, 8)}...
                            </span>
                          ) : null}
                          {job.failedReason && (
                            <p className="mt-1 text-xs text-rose-300">{job.failedReason}</p>
                          )}
                        </div>
                        <span className={[
                          "shrink-0 rounded-full px-2 py-1 text-xs",
                          job.status === "active" ? "bg-indigo-400/20 text-indigo-300" :
                          job.status === "failed" ? "bg-rose-400/20 text-rose-300" :
                          "bg-white/10 text-slate-400",
                        ].join(" ")}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expanded === q.name && q.recentJobs.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">{t("noJobs")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
