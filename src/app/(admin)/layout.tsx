import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-slate-950/60 px-4 py-6">
        <Link
          href="/admin"
          className="mb-8 block text-lg font-semibold text-white"
        >
          Admin
        </Link>
        <nav className="space-y-1">
          <NavLink href="/admin/invite-codes">邀请码</NavLink>
          <NavLink href="/admin/users">用户管理</NavLink>
        </nav>
        <div className="mt-8 border-t border-white/10 pt-4">
          <Link
            href="/projects"
            className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            ← 返回主站
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
