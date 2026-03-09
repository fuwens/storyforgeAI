"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const inviteCode = formData.get("inviteCode") as string;

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, inviteCode }),
    });

    setLoading(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "注册失败");
      return;
    }

    router.push("/login");
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-10 backdrop-blur">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-indigo-300">Internal Creator Suite</p>
        <h1 className="mb-4 text-5xl font-semibold leading-tight text-white">
          加入 StoryForge 内测
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          使用邀请码注册账号，即可开始使用 StoryForge AI 工作台。
          内测阶段仅限受邀用户访问。
        </p>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-black/30">
        <h2 className="mb-2 text-2xl font-semibold text-white">注册账号</h2>
        <p className="mb-6 text-sm text-slate-400">
          填写邮箱、密码和邀请码完成注册
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
              minLength={6}
              placeholder="至少 6 位"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">确认密码</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder="再次输入密码"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">邀请码</span>
            <input
              name="inviteCode"
              type="text"
              required
              placeholder="8 位邀请码"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none uppercase tracking-widest"
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-indigo-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          已有账号？
          <Link href="/login" className="text-indigo-300 hover:text-indigo-200 ml-1">
            去登录
          </Link>
        </p>
      </section>
    </main>
  );
}
