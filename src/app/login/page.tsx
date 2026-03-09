import { Suspense } from "react";

import { LoginForm } from "@/components/ui/login-form";

export default function LoginPage() {

  return (
    <main className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-10 backdrop-blur">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-indigo-300">Internal Creator Suite</p>
        <h1 className="mb-4 text-5xl font-semibold leading-tight text-white">
          给内容生产用的，不是给架构自嗨用的。
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-300">
          StoryForge 把主题、脚本、分镜、Prompt、批量出图和出视频串成一个工作台。
          第一版默认单用户内部使用，重点是批量稳定和返工效率。
        </p>
      </section>
      <Suspense fallback={<div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
