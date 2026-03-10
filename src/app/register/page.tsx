"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("register");

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
      setError(t("passwordMismatch"));
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
      setError(payload.error || t("defaultError"));
      return;
    }

    router.push("/login");
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-10 backdrop-blur">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-indigo-300">{t("badge")}</p>
        <h1 className="mb-4 text-5xl font-semibold leading-tight text-white">
          {t("hero")}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          {t("heroDesc")}
        </p>
      </section>
      <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-black/30">
        <h2 className="mb-2 text-2xl font-semibold text-white">{t("title")}</h2>
        <p className="mb-6 text-sm text-slate-400">
          {t("subtitle")}
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">{t("email")}</span>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none ring-0 placeholder:text-slate-500"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">{t("password")}</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">{t("confirmPassword")}</span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder={t("confirmPasswordPlaceholder")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">{t("inviteCode")}</span>
            <input
              name="inviteCode"
              type="text"
              required
              placeholder={t("inviteCodePlaceholder")}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none uppercase tracking-widest"
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-indigo-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-indigo-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          {t("hasAccount")}
          <Link href="/login" className="text-indigo-300 hover:text-indigo-200 ml-1">
            {t("loginLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
