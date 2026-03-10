"use client";

import { useCallback, useEffect, useState } from "react";

type InviteCode = {
  id: string;
  code: string;
  usedBy: string | null;
  usedAt: string | null;
  disabled: boolean;
  createdAt: string;
};

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [genCount, setGenCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    const res = await fetch("/api/admin/invite-codes");
    const data = await res.json();
    setCodes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  async function handleGenerate() {
    setGenerating(true);
    await fetch("/api/admin/invite-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: genCount }),
    });
    await fetchCodes();
    setGenerating(false);
  }

  async function handleDisable(code: string) {
    await fetch("/api/admin/invite-codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    await fetchCodes();
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  function getStatus(item: InviteCode) {
    if (item.disabled) return { label: "已作废", color: "text-slate-500" };
    if (item.usedBy) return { label: "已使用", color: "text-emerald-400" };
    return { label: "未使用", color: "text-amber-400" };
  }

  if (loading) {
    return <p className="text-slate-400">加载中...</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">邀请码管理</h1>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={100}
            value={genCount}
            onChange={(e) => setGenCount(Number(e.target.value))}
            className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成邀请码"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">邀请码</th>
              <th className="px-4 py-3 font-medium text-slate-400">状态</th>
              <th className="px-4 py-3 font-medium text-slate-400">使用者</th>
              <th className="px-4 py-3 font-medium text-slate-400">创建时间</th>
              <th className="px-4 py-3 font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {codes.map((item) => {
              const status = getStatus(item);
              return (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-white">{item.code}</td>
                  <td className={`px-4 py-3 ${status.color}`}>{status.label}</td>
                  <td className="px-4 py-3 text-slate-400">{item.usedBy || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(item.code)}
                        className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        {copied === item.code ? "已复制" : "复制"}
                      </button>
                      {!item.usedBy && !item.disabled && (
                        <button
                          onClick={() => handleDisable(item.code)}
                          className="rounded-md px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10"
                        >
                          作废
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {codes.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">暂无邀请码</p>
        )}
      </div>
    </div>
  );
}
