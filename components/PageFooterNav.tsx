"use client";

import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Landmark,
  Receipt,
  ScrollText,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/connect-bank", label: "Connect bank", icon: Landmark },
  { href: "/overview", label: "Overview", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/expenses", label: "Receipts", icon: Receipt },
  { href: "/summaries", label: "Weekly summary", icon: ScrollText },
  { href: "/lessons", label: "Lesson", icon: BookOpen },
];

const linkClass =
  "inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink transition duration-200 hover:bg-cream-dark hover:text-teal";

export function PageFooterNav() {
  const pathname = usePathname();
  const index = PAGES.findIndex(
    (page) => pathname === page.href || pathname.startsWith(`${page.href}/`),
  );

  if (index === -1) {
    return (
      <nav
        aria-label="More pages"
        className="mt-10 flex flex-wrap gap-2 rounded-3xl border border-line bg-card p-2"
      >
        {PAGES.map((page) => (
          <Link key={page.href} href={page.href} className={linkClass}>
            <page.icon size={15} className="shrink-0 text-teal" aria-hidden="true" />
            {page.label}
          </Link>
        ))}
      </nav>
    );
  }

  const previous = PAGES[index - 1];
  const next = PAGES[index + 1];

  return (
    <nav
      aria-label="More pages"
      className="mt-10 flex items-center justify-between gap-3 rounded-full border border-line bg-card px-2 py-2"
    >
      {previous ? (
        <Link href={previous.href} className={linkClass}>
          <ArrowLeft size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{previous.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className={`${linkClass} ml-auto`}>
          <span className="truncate">{next.label}</span>
          <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}
