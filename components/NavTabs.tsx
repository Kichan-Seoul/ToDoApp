"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "오늘" },
  { href: "/weekly", label: "주간 계획" },
  { href: "/goals", label: "1년 목표" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex h-20 items-center gap-8">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex h-full items-center text-base font-semibold transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ink" aria-hidden />
            )}
          </Link>
        );
      })}
    </div>
  );
}
