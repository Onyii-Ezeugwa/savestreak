"use client";

import { cn } from "@/lib/cn";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  "Reading your goal and target amount",
  "Figuring out how many weeks you have",
  "Checking a realistic savings cadence",
  "Comparing that cadence with your timeline",
  "Drafting habit tips you can keep",
  "Choosing a first action for this week",
  "Putting your $aveStreak plan together",
] as const;

const EXPECTED_MS = 20_000;

interface PlannerThinkingProps {
  goalName: string;
}

export function PlannerThinking({ goalName }: PlannerThinkingProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const slice = EXPECTED_MS / STEPS.length;

    const interval = window.setInterval(() => {
      const next = Math.min(
        STEPS.length - 1,
        Math.floor((Date.now() - startedAt) / slice),
      );
      setStep(next);
    }, 200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="animate-fade-up"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        <Sparkles size={14} aria-hidden="true" />
        Thinking
      </p>
      <h3 className="mt-3 font-display text-2xl text-ink">
        Building a plan for {goalName}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Working through your goal, timeline, and a savings rhythm that can
        stick.
      </p>

      <ol className="mt-6 space-y-3">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;

          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 transition-colors",
                current
                  ? "border-teal/25 bg-teal/5 text-ink"
                  : done
                    ? "border-line bg-cream/70 text-ink"
                    : "border-transparent text-muted",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none",
                  current && "bg-teal text-white",
                  done && "bg-green text-white",
                  !current && !done && "bg-cream-dark text-muted",
                )}
              >
                {done ? (
                  <Check size={13} strokeWidth={2.75} aria-hidden="true" />
                ) : (
                  <span className="block translate-y-[0.5px] leading-none">
                    {index + 1}
                  </span>
                )}
              </span>
              <span>
                {label}
                {current ? (
                  <span className="ml-1 inline-flex gap-0.5" aria-hidden="true">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse [animation-delay:150ms]">
                      .
                    </span>
                    <span className="animate-pulse [animation-delay:300ms]">
                      .
                    </span>
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
