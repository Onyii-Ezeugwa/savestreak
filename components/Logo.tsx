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
        className="hex grid h-8 w-8 place-items-center bg-teal text-sm font-bold text-white"
      >
        $
      </span>
      <span>
        <span className="text-teal">$</span>aveStreak
      </span>
    </Link>
  );
}
