import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "StoryForge AI",
  description: "Internal MVP for faceless YouTube batch image and video generation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-6 py-8">
          <header className="mb-8 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
            <Link href="/projects" className="text-xl font-semibold tracking-wide text-white">
              StoryForge AI
            </Link>
            <p className="text-sm text-slate-300">
              面向 faceless YouTube 工作流的内部 MVP
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
