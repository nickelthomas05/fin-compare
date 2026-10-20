"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bookmark, Crown, CreditCard, FileText, LayoutDashboard, LogIn, Moon, UserRound } from "lucide-react";
import type { PlanId } from "@/lib/plans";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/report", label: "Reports", icon: FileText },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/account", label: "Account", icon: UserRound },
];

export function Sidebar({ plan, email, authEnabled }: { plan: PlanId; email: string | null; authEnabled: boolean }) {
  const path = usePathname();
  return (
    <aside className="no-print glass sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 flex-col p-4 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-2 pt-1">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-cyan/30 to-blue/30 ring-1 ring-cyan/40">
          <BarChart3 className="size-5 text-cyan" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold leading-tight">FinCompare</span>
          <span className="block text-[11px] text-muted">Statements in focus</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              prefetch={false}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                active ? "glass-glow bg-blue/15 text-fg" : "text-muted hover:bg-white/5 hover:text-fg"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        {plan !== "pro" && (
          <div className="glass glass-glow p-4">
            <span className="mb-3 grid size-8 place-items-center rounded-lg bg-blue/25 ring-1 ring-blue/50">
              <Crown className="size-4 text-cyan" />
            </span>
            <p className="text-sm font-semibold">{plan === "free" ? "Upgrade your plan" : "Upgrade to Pro"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {plan === "free" ? "Quarterly data, 10 years of history and more companies." : "Every ratio trend, saved comparisons and PDF reports."}
            </p>
            <Link href="/pricing" className="btn btn-primary mt-3 w-full">
              See plans →
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2.5 px-2 text-xs text-muted">
          {email ? (
            <>
              <span className="grid size-7 place-items-center rounded-full bg-blue/30 text-[11px] font-semibold text-fg">
                {email[0].toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-fg">{email}</span>
                <span className="capitalize">{plan} plan</span>
              </span>
            </>
          ) : authEnabled ? (
            <Link href="/login" className="flex items-center gap-2 hover:text-fg">
              <LogIn className="size-4" /> Sign in · Free plan
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Moon className="size-4" /> Read the numbers, not the noise.
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="no-print glass mb-4 flex items-center gap-1 overflow-x-auto p-1.5 md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            prefetch={false}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${active ? "bg-blue/25 text-fg" : "text-muted"}`}
          >
            <Icon className="size-3.5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
