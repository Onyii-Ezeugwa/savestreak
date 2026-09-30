"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { GoalDatePicker } from "@/components/GoalDatePicker";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type AccountGoal,
  type ApiErrorPayload,
} from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<AccountGoal[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function refreshGoals() {
    try {
      const payload = await apiRequest<{ goals: AccountGoal[] }>("/goals");
      setGoals(payload.goals);
      setLoadError(null);
    } catch (caught) {
      setLoadError((caught as ApiErrorPayload).error);
    }
  }

  useEffect(() => {
    if (user?.status === "active") {
      void refreshGoals();
    }
  }, [user]);

  if (loading || !user) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading your player HUD...</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Player HUD
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Welcome, {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => {
          void logout().then(() => router.push("/"));
        }}>
          Log out
        </Button>
      </div>

      {user.status === "pending_consent" ? (
        <div className="mt-8 rounded-3xl border border-gold/40 bg-gold/10 p-6">
          <h2 className="font-display text-2xl text-ink">
            Waiting on parent or guardian approval
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Your account is created, but savings goals stay locked until a
            parent or guardian approves the consent request.
          </p>
        </div>
      ) : null}

      {user.status === "restricted" ? (
        <div className="mt-8 rounded-3xl border border-orange/30 bg-orange/8 p-6">
          <h2 className="font-display text-2xl text-ink">Account restricted</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A parent or guardian declined consent, so this account cannot
            create or manage savings goals.
          </p>
        </div>
      ) : null}

      {user.status === "active" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <h2 className="font-display text-2xl text-ink">Your quests</h2>
            {loadError ? (
              <p className="text-sm text-orange">{loadError}</p>
            ) : null}
            {goals.length === 0 && !loadError ? (
              <p className="text-sm text-muted">
                No savings goals yet. Create one to start tracking progress.
              </p>
            ) : null}
            {goals.map((goal) => (
              <article key={goal.id} className="game-panel rounded-3xl p-5">
                {editingId === goal.id ? (
                  <GoalForm
                    initial={goal}
                    submitLabel="Save changes"
                    onCancel={() => setEditingId(null)}
                    onSaved={async () => {
                      setEditingId(null);
                      await refreshGoals();
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl text-ink">
                          {goal.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted">
                          {MONEY.format(goal.currentAmount)} saved of{" "}
                          {MONEY.format(goal.targetAmount)} by{" "}
                          {formatDisplayDate(goal.targetDate)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-teal">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-sm border border-teal/20 bg-cream-dark">
                      <div
                        className="h-full bg-teal"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(goal.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await apiRequest(`/goals/${goal.id}`, {
                            method: "DELETE",
                          });
                          await refreshGoals();
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          <aside className="game-panel h-fit rounded-3xl p-5">
            <h2 className="font-display text-2xl text-ink">New goal</h2>
            <p className="mt-1 text-sm text-muted">
              Name it, set a target, and pick a date that has not passed.
            </p>
            <div className="mt-4">
              <GoalForm
                submitLabel="Create goal"
                onSaved={refreshGoals}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function GoalForm({
  initial,
  submitLabel,
  onSaved,
  onCancel,
}: {
  initial?: AccountGoal;
  submitLabel: string;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(initial.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    initial ? String(initial.currentAmount) : "0",
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const body = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount || 0),
        targetDate,
      };
      if (initial) {
        await apiRequest(`/goals/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest("/goals", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setName("");
        setTargetAmount("");
        setCurrentAmount("0");
        setTargetDate("");
      }
      await onSaved();
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error);
      setFieldErrors(payload.fieldErrors ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Goal name"
        value={name}
        error={fieldErrors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <Field
        label="Target amount"
        type="number"
        min="1"
        step="1"
        value={targetAmount}
        error={fieldErrors.targetAmount}
        onChange={(event) => setTargetAmount(event.target.value)}
      />
      <Field
        label="Saved so far"
        type="number"
        min="0"
        step="1"
        value={currentAmount}
        error={fieldErrors.currentAmount}
        onChange={(event) => setCurrentAmount(event.target.value)}
      />
      <div>
        <p className="text-sm font-medium text-ink">Target date</p>
        <div className="mt-2">
          <GoalDatePicker
            id={initial ? `edit-date-${initial.id}` : "new-goal-date"}
            value={targetDate}
            onChange={setTargetDate}
            error={fieldErrors.targetDate}
          />
        </div>
        {fieldErrors.targetDate ? (
          <p className="mt-2 text-sm text-orange">{fieldErrors.targetDate}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-orange">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
