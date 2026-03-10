"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

type UserMenuProps = {
  email: string;
  role: string;
};

export function UserMenu({ email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("userMenu");
  const locale = useLocale();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleSwitchLanguage(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    setOpen(false);
    router.refresh();
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white cursor-pointer"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-slate-900 py-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>

          {role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              {t("adminPanel")}
            </Link>
          )}

          <div className="my-1 border-t border-white/10" />

          {/* Language switcher */}
          <div className="px-3 py-1">
            <p className="mb-1 text-xs text-slate-500">{t("language")}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSwitchLanguage("zh")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                  locale === "zh"
                    ? "bg-indigo-500/30 text-indigo-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                🇨🇳 {t("zh")}
              </button>
              <button
                onClick={() => handleSwitchLanguage("en")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition cursor-pointer ${
                  locale === "en"
                    ? "bg-indigo-500/30 text-indigo-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                🇺🇸 {t("en")}
              </button>
            </div>
          </div>

          <div className="my-1 border-t border-white/10" />

          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 cursor-pointer"
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
