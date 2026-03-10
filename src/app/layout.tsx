import type { Metadata } from "next";
import Link from "next/link";

import { getSession } from "@/lib/auth";
import { UserMenu } from "@/components/ui/user-menu";

import "./globals.css";

export const metadata: Metadata = {
  title: "StoryForge AI",
  description: "Internal MVP for faceless YouTube batch image and video generation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-6 py-8">
          <header className="mb-8 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
            <Link href="/projects" className="text-xl font-semibold tracking-wide text-white">
              StoryForge AI
            </Link>
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-300">
                面向 faceless YouTube 工作流的内部 MVP
              </p>
              {session && <UserMenu email={session.email} role={session.role} />}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
