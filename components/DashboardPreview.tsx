import { HexBadge } from "@/components/HexBadge";
import { Flame, Medal, Sparkles, Swords, Target, Trophy } from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md pt-4">
      <div className="hud-chip absolute right-4 top-0 z-10 text-ink">
        <span className="animate-soft-pulse h-2 w-2 rounded-full bg-green" />
        Quest complete
      </div>

      <div className="game-panel overflow-hidden rounded-[1.7rem]">
        <div className="flex items-center justify-between border-b border-line bg-cream-dark/60 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Player HUD
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gold">840 XP</span>
            <HexBadge size="sm" className="bg-teal text-white">
              JS
            </HexBadge>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                Active quest
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal">
                <Target size={12} aria-hidden="true" />
                53%
              </span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <HexBadge
                size="lg"
                aria-label="Player level 4"
                className="mt-0.5 shrink-0 bg-gold text-ink"
              >
                <span className="flex flex-col items-center leading-none">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-80">
                    Lv
                  </span>
                  <span className="text-lg leading-none">4</span>
                </span>
              </HexBadge>
              <div>
                <h3 className="font-display text-2xl text-ink">New Laptop</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-semibold text-ink">$420</span> saved of
                  $800
                </p>
              </div>
            </div>

            <div
              className="mt-4 h-3 overflow-hidden rounded-sm border border-teal/20 bg-cream-dark"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={800}
              aria-valuenow={420}
              aria-label="New Laptop savings progress"
            >
              <div className="animate-fill-bar h-full w-[53%] bg-teal" />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                <span>Level 4</span>
                <span>160 XP to 5</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-sm border border-gold/30 bg-cream-dark">
                <div className="h-full w-[68%] bg-gold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-dashed border-orange/40 bg-cream/80 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-orange">
                <Flame size={14} className="animate-soft-pulse" aria-hidden="true" />
                Streak
              </p>
              <p className="mt-1.5 text-lg font-semibold leading-tight text-ink">
                12 Day
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-green/40 bg-cream/80 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-green">
                <Swords size={14} aria-hidden="true" />
                Daily
              </p>
              <p className="mt-1.5 text-lg font-semibold text-ink">$18 left</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HexBadge size="sm" className="bg-gold text-ink">
              <Medal size={13} />
            </HexBadge>
            <HexBadge size="sm" className="bg-orange text-white">
              <Flame size={13} />
            </HexBadge>
            <HexBadge size="sm" className="bg-teal text-white">
              <Trophy size={13} />
            </HexBadge>
            <span className="text-xs font-medium text-muted">
              3 badges unlocked
            </span>
          </div>

          <div className="rounded-2xl border border-teal/20 bg-cream p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-teal">
              <Sparkles size={13} aria-hidden="true" />
              Coach
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">
              Nice pace. Put $18 more toward this laptop this week and your
              12-day streak stays alive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
