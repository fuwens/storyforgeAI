"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type DirStats = {
  fileCount: number;
  totalBytes: number;
};

type CleanupResult = {
  scanned: number;
  deleted: number;
  bytesFreed: number;
  skipped: number;
  errors: string[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function AdminCleanupPage() {
  const t = useTranslations("adminCleanup");
  const [stats, setStats] = useState<DirStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/cleanup/stats");
    if (res.ok) {
      const data = (await res.json()) as DirStats;
      setStats(data);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  async function handleCleanup() {
    setLoading(true);
    const res = await fetch("/api/admin/cleanup", { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const result = (await res.json()) as CleanupResult;
      setLastResult(result);
      await fetchStats();
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t("badge")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Directory stats */}
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">{t("statsTitle")}</h2>
        {stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">{t("fileCount")}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.fileCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">{t("diskUsage")}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatBytes(stats.totalBytes)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t("loading")}</p>
        )}
      </div>

      {/* Cleanup action */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6">
        <h2 className="mb-2 text-lg font-semibold text-white">{t("cleanupTitle")}</h2>
        <p className="mb-6 text-sm text-slate-400">{t("cleanupDesc")}</p>
        <button
          onClick={handleCleanup}
          disabled={loading}
          className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60 cursor-pointer"
        >
          {loading ? t("cleaning") : t("cleanupBtn")}
        </button>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("resultTitle")}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">{t("scanned")}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{lastResult.scanned}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("deleted")}</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{lastResult.deleted}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("freed")}</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatBytes(lastResult.bytesFreed)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("skipped")}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-300">{lastResult.skipped}</p>
            </div>
          </div>
          {lastResult.errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-300">{t("errors")}</p>
              <ul className="space-y-1 text-xs text-rose-200">
                {lastResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
