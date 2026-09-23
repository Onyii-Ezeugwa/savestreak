"use client";

import { Button } from "@/components/Button";
import { GoalDatePicker } from "@/components/GoalDatePicker";
import { PlannerThinking } from "@/components/PlannerThinking";
import { cn } from "@/lib/cn";
import {
  SAVINGS_FREQUENCY_OPTIONS,
  frequencyLabel,
  type SavingsFrequency,
} from "@/lib/savings";
import { PLANNER_TRIAL_LIMIT } from "@/lib/planner-trial";
import type { GoalExample, GoalPlan, GoalPlanResponse } from "@/lib/types";
import { GOAL_EXAMPLES } from "@/lib/types";
import { validateGoalPlanInput } from "@/lib/validation";
import { useEffect, useState, type FormEvent } from "react";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function GoalPlanner() {
  const [goalType, setGoalType] = useState<GoalExample>("Laptop");
  const [customGoal, setCustomGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [savingsAmount, setSavingsAmount] = useState("");
  const [savingsFrequency, setSavingsFrequency] =
    useState<SavingsFrequency>("week");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  const goalName = goalType === "Other" ? customGoal : goalType;
  const trialRemaining = remainingUses ?? PLANNER_TRIAL_LIMIT;
  const trialUsedUp = remainingUses === 0;

  useEffect(() => {
    let active = true;

    fetch("/api/goal-plan")
      .then((response) => response.json())
      .then((payload: { remaining?: number }) => {
        if (active && typeof payload.remaining === "number") {
          setRemainingUses(payload.remaining);
        }
      })
      .catch(() => {
        // Keep the form usable if the trial check fails to load.
      });

    return () => {
      active = false;
    };
  }, []);

  function resetResult() {
    setPlan(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validation = validateGoalPlanInput({
      goalName,
      amount,
      targetDate,
      savingsAmount: savingsAmount || undefined,
      savingsFrequency,
    });

    if (!validation.valid || !validation.data) {
      setFieldErrors(validation.errors);
      return;
    }

    if (trialUsedUp) {
      setFormError(
        "You have used all 5 free Goal Planner trials. Create a free account to keep planning.",
      );
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/goal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      const payload = (await response.json()) as
        | GoalPlanResponse
        | { error?: string; fieldErrors?: Record<string, string>; remainingUses?: number };

      if (typeof payload.remainingUses === "number") {
        setRemainingUses(payload.remainingUses);
      }

      if (!response.ok) {
        if ("fieldErrors" in payload && payload.fieldErrors) {
          setFieldErrors(payload.fieldErrors);
        }
        setFormError(
          "error" in payload && payload.error
            ? payload.error
            : "We could not build your plan just now.",
        );
        return;
      }

      setPlan(payload as GoalPlanResponse);
    } catch {
      setFormError(
        "We could not reach the planner. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="goal-planner"
      aria-labelledby="goal-planner-heading"
      className="scroll-mt-24 border-y border-line bg-cream-dark/40"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="goal-planner-heading"
            className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            See how quickly you could reach your goal
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Try the $aveStreak AI Goal Planner. No account needed.
          </p>
          <p
            className={
              trialUsedUp
                ? "mt-5 inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white"
                : "mt-5 inline-flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white"
            }
            aria-live="polite"
          >
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/20 px-1.5 text-xs font-bold">
              {trialUsedUp ? 0 : trialRemaining}
            </span>
            {trialUsedUp
              ? "All 5 free plans used"
              : `of ${PLANNER_TRIAL_LIMIT} free plans left`}
          </p>
        </div>

        <div className="game-panel relative z-10 mx-auto mt-10 max-w-2xl overflow-visible rounded-3xl p-5 sm:p-8">
          {plan ? (
            <div className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
                Your $aveStreak Plan
              </p>
              {plan.source === "mock" ? (
                <p className="mt-2 text-xs text-muted">
                  Sample plan for demo. Add an OpenRouter key to generate a
                  live AI plan.
                </p>
              ) : null}

              <p className="mt-4 text-sm leading-7 text-ink">{plan.summary}</p>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-cream p-4">
                  <dt className="text-xs font-medium text-muted">Goal</dt>
                  <dd className="mt-1 font-semibold text-ink">{plan.goal}</dd>
                </div>
                <div className="rounded-2xl bg-cream p-4">
                  <dt className="text-xs font-medium text-muted">Target</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {CURRENCY_FORMATTER.format(plan.target)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-cream p-4">
                  <dt className="text-xs font-medium text-muted">Timeline</dt>
                  <dd className="mt-1 font-semibold text-ink">
                    {plan.timelineWeeks} week
                    {plan.timelineWeeks === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="rounded-2xl bg-cream p-4">
                  <dt className="text-xs font-medium text-muted">
                    Suggested savings
                  </dt>
                  <dd className="mt-1 font-semibold text-teal">
                    {CURRENCY_FORMATTER.format(plan.cadenceAmount)}{" "}
                    {frequencyLabel(plan.cadenceFrequency)}
                  </dd>
                  {plan.cadenceFrequency !== "week" ? (
                    <p className="mt-1 text-xs text-muted">
                      About {CURRENCY_FORMATTER.format(plan.weeklySavings)} each
                      week
                    </p>
                  ) : null}
                </div>
              </dl>

              {plan.milestones.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ink">
                    Checkpoints
                  </h3>
                  <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {plan.milestones.map((milestone) => (
                      <li
                        key={`${milestone.week}-${milestone.amount}`}
                        className="rounded-2xl border border-line bg-cream/70 px-4 py-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
                          Week {milestone.week}
                        </p>
                        <p className="mt-1 font-semibold text-ink">
                          {CURRENCY_FORMATTER.format(milestone.amount)}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-ink">
                  How to make it stick
                </h3>
                <ol className="mt-3 space-y-2">
                  {plan.suggestions.map((suggestion, index) => (
                    <li
                      key={`${index}-${suggestion.slice(0, 24)}`}
                      className="rounded-2xl border border-line px-4 py-3 text-sm leading-6 text-ink"
                    >
                      <span className="mr-2 font-semibold text-teal">
                        {index + 1}.
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-8 rounded-2xl bg-teal px-5 py-6 text-white">
                <h3 className="font-display text-2xl">
                  Ready to make it happen?
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  Create your free $aveStreak account to save your goal, track
                  your progress, and get personalized coaching.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button href="/signup" variant="inverse">
                    Sign Up & Start My Goal
                  </Button>
                  {trialUsedUp ? null : (
                    <Button
                      variant="ghost"
                      className="text-white hover:bg-white/10 hover:text-white"
                      onClick={resetResult}
                    >
                      Edit answers
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : loading ? (
            <PlannerThinking goalName={goalName || "your goal"} />
          ) : trialUsedUp ? (
            <div className="animate-fade-up">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
                Free trial limit
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink">
                You have used all 5 free plans
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                Create a free $aveStreak account to save your goals, keep
                planning, and get personalized coaching.
              </p>
              <div className="mt-6">
                <Button href="/signup">Sign Up & Keep Planning</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <fieldset>
                <legend className="text-sm font-medium text-ink">
                  What are you saving for?
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {GOAL_EXAMPLES.map((example) => {
                    const selected = goalType === example;
                    return (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setGoalType(example);
                          if (fieldErrors.goalName) {
                            setFieldErrors((current) => {
                              const next = { ...current };
                              delete next.goalName;
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-sm transition-colors",
                          selected
                            ? "border-teal bg-teal text-white"
                            : "border-line bg-cream text-ink hover:border-teal/40",
                        )}
                        aria-pressed={selected}
                      >
                        {example}
                      </button>
                    );
                  })}
                </div>
                {goalType === "Other" ? (
                  <input
                    id="custom-goal"
                    value={customGoal}
                    onChange={(event) => setCustomGoal(event.target.value)}
                    placeholder="Name your goal"
                    className="mt-3 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder:text-muted/80"
                    aria-invalid={Boolean(fieldErrors.goalName)}
                    aria-describedby={
                      fieldErrors.goalName ? "goal-name-error" : undefined
                    }
                  />
                ) : null}
                {fieldErrors.goalName ? (
                  <p id="goal-name-error" className="mt-2 text-sm text-orange">
                    {fieldErrors.goalName}
                  </p>
                ) : null}
              </fieldset>

              <div>
                <label htmlFor="goal-amount" className="text-sm font-medium text-ink">
                  How much do you need?
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
                    $
                  </span>
                  <input
                    id="goal-amount"
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="600"
                    className="w-full rounded-2xl border border-line bg-cream py-3 pl-8 pr-4 text-sm text-ink placeholder:text-muted/80"
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={
                      fieldErrors.amount ? "goal-amount-error" : undefined
                    }
                  />
                </div>
                {fieldErrors.amount ? (
                  <p id="goal-amount-error" className="mt-2 text-sm text-orange">
                    {fieldErrors.amount}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="goal-date" className="text-sm font-medium text-ink">
                  When do you want to reach your goal?
                </label>
                <div className="mt-2">
                  <GoalDatePicker
                    id="goal-date"
                    value={targetDate}
                    onChange={(nextDate) => {
                      setTargetDate(nextDate);
                      if (fieldErrors.targetDate) {
                        setFieldErrors((current) => {
                          const next = { ...current };
                          delete next.targetDate;
                          return next;
                        });
                      }
                    }}
                    error={fieldErrors.targetDate}
                    describedBy={
                      fieldErrors.targetDate ? "goal-date-error" : undefined
                    }
                  />
                </div>
                {fieldErrors.targetDate ? (
                  <p id="goal-date-error" className="mt-2 text-sm text-orange">
                    {fieldErrors.targetDate}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="savings-amount"
                  className="text-sm font-medium text-ink"
                >
                  How much could you comfortably save?{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_12rem]">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
                      $
                    </span>
                    <input
                      id="savings-amount"
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="1"
                      value={savingsAmount}
                      onChange={(event) => setSavingsAmount(event.target.value)}
                      placeholder="40"
                      className="w-full rounded-2xl border border-line bg-cream py-3 pl-8 pr-4 text-sm text-ink placeholder:text-muted/80"
                      aria-invalid={Boolean(fieldErrors.savingsAmount)}
                      aria-describedby={
                        fieldErrors.savingsAmount
                          ? "savings-amount-error"
                          : undefined
                      }
                    />
                  </div>
                  <label className="sr-only" htmlFor="savings-frequency">
                    Savings frequency
                  </label>
                  <select
                    id="savings-frequency"
                    value={savingsFrequency}
                    onChange={(event) =>
                      setSavingsFrequency(
                        event.target.value as SavingsFrequency,
                      )
                    }
                    className="w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm text-ink"
                  >
                    {SAVINGS_FREQUENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.savingsAmount ? (
                  <p
                    id="savings-amount-error"
                    className="mt-2 text-sm text-orange"
                  >
                    {fieldErrors.savingsAmount}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
                >
                  {formError}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Build My Quick Plan
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
