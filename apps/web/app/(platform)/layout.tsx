import {
  Activity,
  ArrowRightLeft,
  BookOpenText,
  CircleUserRound,
  LayoutDashboard,
  Network,
  Search,
  Settings,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { roleLabels } from "@/lib/roles";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Knowledge", icon: BookOpenText, href: "/knowledge" },
  { label: "Experts", icon: Search, href: "/experts" },
  { label: "People", icon: UsersRound, href: "/people" },
  { label: "Simulation", icon: Activity, href: "/simulate" },
  { label: "Transfers", icon: ArrowRightLeft },
  { label: "Knowledge graph", icon: Network },
];

export default async function PlatformLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-[#f5f6f2] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <aside className="hidden min-h-screen border-r border-slate-200 bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <BrandMark className="px-2" />
        <div className="mt-8 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            Northstar Industries
          </p>
        </div>

        <nav aria-label="Primary navigation" className="mt-6 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            return item.href ? (
              <NavLink
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                activeClassName="bg-emerald-950 font-semibold text-white"
                inactiveClassName="font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </NavLink>
            ) : (
              <span
                key={item.label}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-400"
              >
                <span className="flex items-center gap-3">
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Soon
                </span>
              </span>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-900">
              <CircleUserRound aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {roleLabels[session.user.role]}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-2 text-xs text-slate-400">
              <Settings aria-hidden="true" className="size-3.5" />
              Settings soon
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <BrandMark />
            <SignOutButton />
          </div>
          <nav
            aria-label="Mobile navigation"
            className="flex gap-1 overflow-x-auto px-4 pb-3 sm:px-6"
          >
            {navigation.map(({ label, href }) =>
              href ? (
                <NavLink
                  key={label}
                  href={href}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                  activeClassName="bg-emerald-950 font-semibold text-white"
                  inactiveClassName="font-medium text-slate-600 hover:bg-slate-100"
                >
                  {label}
                </NavLink>
              ) : null,
            )}
          </nav>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8 xl:p-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
