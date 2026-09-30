"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/logo";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Today", icon: "◎" },
  { href: "/coach", label: "AI Coach", icon: "✦" },
  { href: "/log", label: "Log", icon: "＋" },
  { href: "/progress", label: "Progress", icon: "◈" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/achievements", label: "Badges", icon: "✦" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  displayName,
  level,
  levelPct,
  streak,
}: {
  displayName: string;
  level: number;
  levelPct: number;
  streak: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-50 border-b border-ink-950/7 bg-canvas/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-ink-950/10 px-3 py-1.5 text-xs font-medium text-ink-950/70"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <nav className="border-t border-ink-950/7 px-4 py-3">
          <ul className="grid gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive(pathname, item.href)
                      ? "bg-ink-950/8 font-medium text-ink-950"
                      : "text-ink-950/55 hover:bg-ink-950/5 hover:text-ink-950/85"
                  }`}
                >
                  <span aria-hidden className="w-4 text-center opacity-70">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="flex items-center gap-2 border-t border-ink-950/7 px-4 py-2 text-xs text-ink-950/45">
        <span className="grid size-6 place-items-center rounded-full bg-ember-400/15 text-[10px] font-semibold text-ember-700">
          {initials || "A"}
        </span>
        <span className="truncate">{displayName}</span>
        <span className="h-1 w-16 overflow-hidden rounded-full bg-ink-950/10">
          <span
            className="block h-full rounded-full bg-ember-400"
            style={{ width: `${Math.max(4, levelPct)}%` }}
          />
        </span>
        <span className="tabular-nums">Lv {level}</span>
        <span className="tabular-nums">🔥 {streak}</span>
        <form action={signOut} className="ml-auto">
          <button type="submit" className="text-ink-950/40 hover:text-ink-950/80">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function DesktopSidebar(props: {
  displayName: string;
  level: number;
  levelPct: number;
  streak: number;
}) {
  const pathname = usePathname();
  const initials = props.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-ink-950/7 bg-canvas/70 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 flex-1">
        <ul className="grid gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-ink-950/8 font-medium text-ink-950"
                      : "text-ink-950/50 hover:bg-ink-950/5 hover:text-ink-950/85"
                  }`}
                >
                  {active && (
                    <span className="absolute top-1/2 -left-4 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ember-400" />
                  )}
                  <span
                    aria-hidden
                    className={`w-4 text-center ${active ? "text-ember-700" : "opacity-60"}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rounded-2xl border border-ink-950/8 bg-ink-950/3 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-ember-300/80 to-ember-500/60 text-xs font-bold text-ink-950">
            {initials || "A"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{props.displayName}</p>
            <p className="text-[11px] text-ink-950/40">
              Level {props.level} · 🔥 {props.streak}d
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-ink-950/40">
            <span>Level progress</span>
            <span className="tabular-nums">{Math.round(props.levelPct)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-950/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-400 to-ember-300 transition-[width] duration-700"
              style={{ width: `${Math.max(2, props.levelPct)}%` }}
            />
          </div>
        </div>

        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-ink-950/10 py-1.5 text-xs text-ink-950/55 transition hover:border-ink-950/20 hover:text-ink-950"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
