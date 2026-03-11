import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations("admin");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-slate-950/60 px-4 py-6">
        <Link
          href="/admin"
          className="mb-8 block text-lg font-semibold text-white"
        >
          {t("title")}
        </Link>
        <nav className="space-y-4">
          <div>
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-widest text-slate-500">
              {t("groupUsers")}
            </p>
            <div className="space-y-0.5">
              <NavLink href="/admin/invite-codes">{t("inviteCodes")}</NavLink>
              <NavLink href="/admin/users">{t("users")}</NavLink>
            </div>
          </div>
          <div>
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-widest text-slate-500">
              {t("groupOps")}
            </p>
            <div className="space-y-0.5">
              <NavLink href="/admin/queues">{t("queues")}</NavLink>
              <NavLink href="/admin/cleanup">{t("cleanup")}</NavLink>
            </div>
          </div>
        </nav>
        <div className="mt-8 border-t border-white/10 pt-4">
          <Link
            href="/projects"
            className="block rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            {t("backToMain")}
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
