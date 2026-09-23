import { Flame, Sparkles, Target } from "lucide-react";

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -right-4 -top-4 hidden rounded-2xl border border-line bg-card px-3 py-2 text-xs font-medium text-ink shadow-[0_8px_24px_rgba(35,31,27,0.06)] sm:block"
      >
        On track this week
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_16px_40px_rgba(35,31,27,0.08)]">
        <div className="flex items-center justify-between border-b border-line bg-cream-dark/50 px-5 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8d4bc]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d9a63c]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-teal/50" />
          </div>
          <p className="text-xs font-medium text-muted">$aveStreak dashboard</p>
          <div className="grid h-7 w-7 place-items-center rounded-full bg-teal text-[11px] font-semibold text-white">
            JS
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Current savings goal
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-ink">New Laptop</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-semibold text-ink">$420</span> saved of
                  $800
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
                <Target size={12} aria-hidden="true" />
                53%
              </span>
            </div>

            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-cream-dark"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={800}
              aria-valuenow={420}
              aria-label="New Laptop savings progress"
            >
              <div className="h-full w-[53%] rounded-full bg-teal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-cream/70 p-3.5">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-orange">
                <Flame size={14} aria-hidden="true" />
                Streak
              </p>
              <p className="mt-1.5 text-lg font-semibold leading-tight text-ink">
                12 Day
              </p>
              <p className="text-xs text-muted">Saving Streak</p>
            </div>
            <div className="rounded-2xl border border-line bg-cream/70 p-3.5">
              <p className="text-xs font-medium text-green">Weekly target</p>
              <p className="mt-1.5 text-lg font-semibold text-ink">$45</p>
              <p className="text-xs text-muted">Still $18 to go</p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-cream p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-teal">
              <Sparkles size={13} aria-hidden="true" />
              AI coach
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
