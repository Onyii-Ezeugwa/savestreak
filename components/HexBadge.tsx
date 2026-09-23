import { cn } from "@/lib/cn";
import type { CSSProperties, ReactNode } from "react";

interface HexBadgeProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

export function HexBadge({
  children,
  className,
  size = "md",
  style,
  "aria-label": ariaLabel,
}: HexBadgeProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "hex inline-grid place-items-center align-middle font-bold leading-none tabular-nums",
        sizeClasses[size],
        className,
      )}
      style={style}
    >
      <span className="hex-label">{children}</span>
    </span>
  );
}
