import { HexBadge } from "@/components/HexBadge";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: "teal" | "green" | "orange" | "gold";
  badge?: string;
}

const accentClasses = {
  teal: "bg-teal text-white",
  green: "bg-green text-white",
  orange: "bg-orange text-white",
  gold: "bg-gold text-ink",
} as const;

export function FeatureCard({
  title,
  description,
  icon: Icon,
  accent = "teal",
  badge,
}: FeatureCardProps) {
  return (
    <article className="game-panel group rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <HexBadge
          className={cn(
            "transition-transform duration-200 group-hover:-translate-y-1",
            accentClasses[accent],
          )}
        >
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
        </HexBadge>
        {badge ? (
          <span className="rounded-md border border-line bg-cream px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
