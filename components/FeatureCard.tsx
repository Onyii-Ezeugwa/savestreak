import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: "teal" | "green" | "orange" | "gold";
}

const accentClasses = {
  teal: "bg-teal/10 text-teal",
  green: "bg-green/12 text-green",
  orange: "bg-orange/12 text-orange",
  gold: "bg-gold/15 text-gold",
} as const;

export function FeatureCard({
  title,
  description,
  icon: Icon,
  accent = "teal",
}: FeatureCardProps) {
  return (
    <article className="group rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(35,31,27,0.04)] transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={cn(
          "mb-4 grid h-11 w-11 place-items-center rounded-xl",
          accentClasses[accent],
        )}
      >
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
