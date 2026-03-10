"use client";

import { useCallback, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ email: string; password: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleDisabled(userId: string, disabled: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, disabled }),
    });
    await fetchUsers();
  }

  async function handleResetPassword(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.password) {
      setModal({ email: user.email, password: data.password });
    }
  }

  if (loading) {
    return <p className="text-slate-400">加载中...</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-white">用户管理</h1>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">邮箱</th>
              <th className="px-4 py-3 font-medium text-slate-400">角色</th>
              <th className="px-4 py-3 font-medium text-slate-400">注册时间</th>
              <th className="px-4 py-3 font-medium text-slate-400">状态</th>
              <th className="px-4 py-3 font-medium text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.role === "admin"
                        ? "rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300"
                        : "rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-300"
                    }
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="px-4 py-3">
                  {user.disabled ? (
                    <span className="text-rose-400">已禁用</span>
                  ) : (
                    <span className="text-emerald-400">正常</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {user.role !== "admin" && (
                      <button
                        onClick={() =>
                          handleToggleDisabled(user.id, !user.disabled)
                        }
                        className={`rounded-md px-2 py-1 text-xs ${
                          user.disabled
                            ? "text-emerald-400 hover:bg-emerald-500/10"
                            : "text-rose-400 hover:bg-rose-500/10"
                        }`}
                      >
                        {user.disabled ? "启用" : "禁用"}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetPassword(user)}
                      className="rounded-md px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10"
                    >
                      重置密码
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-white">密码已重置</h2>
            <p className="mb-1 text-sm text-slate-400">{modal.email}</p>
            <div className="my-4 rounded-lg bg-white/5 px-4 py-3 font-mono text-lg text-emerald-400">
              {modal.password}
            </div>
            <p className="mb-4 text-xs text-slate-500">
              请复制此密码并发送给用户，此窗口关闭后无法再次查看。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modal.password);
                }}
                className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-medium text-white hover:bg-indigo-400"
              >
                复制密码
              </button>
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
