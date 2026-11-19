"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { GoalDatePicker } from "@/components/GoalDatePicker";
import {
  apiRequest,
  type AccountGoal,
  type ApiErrorPayload,
} from "@/lib/api";
import { requiredSavings } from "@/lib/goal-progress";
import { useState, type FormEvent } from "react";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SavingsPreview({
  targetAmount,
  currentAmount,
  targetDate,
}: {
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
}) {
  const target = Number(targetAmount);
  const saved = Number(currentAmount || 0);
  if (!Number.isFinite(target) || target <= 0 || !targetDate) {
    return null;
  }
  const pace = requiredSavings({
    currentAmountCents: Math.round(Math.max(0, saved) * 100),
    targetAmountCents: Math.round(target * 100),
    targetDate,
  });
  if (!pace) {
    return null;
  }
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <p className="rounded-2xl border border-line bg-cream px-4 py-3 text-sm leading-6 text-ink">
      About {money.format(pace.weeklyCents / 100)} a week, or{" "}
      {money.format(pace.monthlyCents / 100)} a month, to reach the new target.
    </p>
  );
}

export function GoalForm({
  initial,
  bankAccounts = [],
  submitLabel,
  onSaved,
  onCancel,
}: {
  initial?: AccountGoal;
  bankAccounts?: Array<{
    id: string;
    name: string;
    accountType: string;
    balance: number;
  }>;
  submitLabel: string;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}) {
  const linkableAccounts = bankAccounts.filter(
    (account) =>
      account.accountType === "savings" || account.accountType === "checking",
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(
    initial ? String(initial.targetAmount) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    initial ? String(initial.currentAmount) : "0",
  );
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState(
    initial?.linkedAccountId ?? "",
  );
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
        ...(initial ? { linkedAccountId: linkedAccountId || null } : {}),
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
        setLinkedAccountId("");
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
        hint={
          linkedAccountId
            ? "Linked account balance overrides this when you save."
            : undefined
        }
      />
      {initial && linkableAccounts.length > 0 ? (
        <div>
          <label
            htmlFor={`linked-account-${initial.id}`}
            className="text-sm font-medium text-ink"
          >
            Linked savings account
          </label>
          <select
            id={`linked-account-${initial.id}`}
            className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm text-ink"
            value={linkedAccountId}
            onChange={(event) => setLinkedAccountId(event.target.value)}
          >
            <option value="">None (manual progress)</option>
            {linkableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({MONEY.format(account.balance)})
              </option>
            ))}
          </select>
          {fieldErrors.linkedAccountId ? (
            <p className="mt-2 text-sm text-orange">
              {fieldErrors.linkedAccountId}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted">
              When linked, progress uses that account balance.
            </p>
          )}
        </div>
      ) : null}
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
      <SavingsPreview
        targetAmount={targetAmount}
        currentAmount={
          linkedAccountId
            ? String(
                linkableAccounts.find((account) => account.id === linkedAccountId)
                  ?.balance ?? currentAmount,
              )
            : currentAmount
        }
        targetDate={targetDate}
      />
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
