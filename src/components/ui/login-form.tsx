"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "登录失败");
      return;
    }

    const payload = (await response.json()) as { ok: boolean; redirect?: string };
    const target = searchParams.get("next") || payload.redirect || "/projects";
    router.push(target);
    router.refresh();
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-black/30">
      <h2 className="mb-2 text-2xl font-semibold text-white">登录</h2>
      <p className="mb-6 text-sm text-slate-400">
        输入邮箱和密码登录 StoryForge
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">邮箱</span>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">密码</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-indigo-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-indigo-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "登录中..." : "进入 StoryForge"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        还没有账号？
        <Link href="/register" className="text-indigo-300 hover:text-indigo-200 ml-1">
          使用邀请码注册
        </Link>
      </p>
    </section>
  );
}
