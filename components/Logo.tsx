import { cn } from "@/lib/cn";
import Link from "next/link";

interface LogoProps {
  className?: string;
  compact?: boolean;
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-ink",
        compact ? "text-base" : "text-lg",
        className,
      )}
      aria-label="$aveStreak home"
    >
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center rounded-xl bg-teal text-sm font-bold text-white shadow-[0_1px_2px_rgba(15,95,98,0.2)]"
      >
        $
      </span>
      <span>
        <span className="text-teal">$</span>aveStreak
      </span>
    </Link>
  );
}
