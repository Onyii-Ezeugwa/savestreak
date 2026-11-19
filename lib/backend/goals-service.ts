import { randomUUID } from "node:crypto";
import { parseDateOnly } from "./auth-service";
import type { DataStore } from "./store";
import { buildCatchUpDrafts } from "@/lib/goal-catchup";
import { recentSpending, wordCatchUp } from "./catchup-service";
import {
  goalIsComplete,
  goalPaceStatus,
  goalProgressPercent,
  goalRemainingCents,
} from "@/lib/goal-progress";
import {
  ApiError,
  type GoalChangeRecord,
  type GoalRecord,
  type GoalSuggestionRecord,
  type PublicGoal,
  type UserRecord,
} from "./types";

export function requireActiveAccount(user: UserRecord) {
  if (user.status === "pending_consent") {
    throw new ApiError(
      403,
      "A parent or guardian still needs to approve this account before you can create a savings goal.",
    );
  }
  if (user.status === "restricted") {
    throw new ApiError(
      403,
      "This account is restricted because a parent or guardian declined consent.",
    );
  }
}

export function toPublicGoal(
  goal: GoalRecord,
  linkedBalanceCents?: number | null,
): PublicGoal {
  const savedCents =
    goal.linkedAccountId && linkedBalanceCents != null
      ? Math.max(0, linkedBalanceCents)
      : goal.currentAmountCents;
  const progress = goalProgressPercent(savedCents, goal.targetAmountCents);
  const completed = goalIsComplete(savedCents, goal.targetAmountCents);
  const pace = goalPaceStatus({
    currentAmountCents: savedCents,
    targetAmountCents: goal.targetAmountCents,
    targetDate: goal.targetDate,
    createdAt: goal.createdAt,
  });

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmountCents / 100,
    currentAmount: savedCents / 100,
    remainingAmount: goalRemainingCents(savedCents, goal.targetAmountCents) / 100,
    targetDate: goal.targetDate,
    progress,
    completed,
    pace,
    linkedAccountId: goal.linkedAccountId,
    savedPlan: goal.savedPlan,
    savedPlanAt: goal.savedPlanAt,
    planStale: goal.planStale,
    changes: [],
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function dollarsToCents(
  value: unknown,
  field: string,
  errors: Record<string, string>,
) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(amount)) {
    errors[field] = "Enter a valid dollar amount.";
    return 0;
  }
  if (amount <= 0) {
    errors[field] = "Amount must be greater than $0.";
    return 0;
  }
  if (amount > 1_000_000) {
    errors[field] = "Enter an amount under $1,000,000.";
    return 0;
  }
  return Math.round(amount * 100);
}

export class GoalsService {
  constructor(private readonly store: DataStore) {}

  async list(user: UserRecord) {
    requireActiveAccount(user);
    const [goals, changes, accounts] = await Promise.all([
      this.store.listGoals(user.id),
      this.store.listGoalChanges(user.id),
      typeof this.store.listBankAccounts === "function"
        ? this.store.listBankAccounts(user.id)
        : Promise.resolve([]),
    ]);
    const changesByGoal = new Map<string, GoalChangeRecord[]>();
    for (const change of changes) {
      const list = changesByGoal.get(change.goalId) ?? [];
      list.push(change);
      changesByGoal.set(change.goalId, list);
    }
    const accountsForGoals = accounts;
    const balanceById = new Map(
      accountsForGoals.map((account) => [account.id, account.balanceCents]),
    );
    return goals.map((goal) => ({
      ...toPublicGoal(
        goal,
        goal.linkedAccountId
          ? (balanceById.get(goal.linkedAccountId) ?? null)
          : null,
      ),
      changes: (changesByGoal.get(goal.id) ?? [])
        .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
        .slice(0, 8)
        .map((change) => ({
        oldTargetAmount: change.oldTargetAmountCents / 100,
        newTargetAmount: change.newTargetAmountCents / 100,
        oldTargetDate: change.oldTargetDate,
        newTargetDate: change.newTargetDate,
        note: change.note ?? null,
        changedAt: change.changedAt,
      })),
    }));
  }

  async create(
    user: UserRecord,
    input: {
      name?: unknown;
      targetAmount?: unknown;
      targetDate?: unknown;
      currentAmount?: unknown;
    },
  ) {
    requireActiveAccount(user);
    const parsed = this.parseGoal(input, {
      requireName: true,
      requireTarget: true,
    });
    const now = new Date().toISOString();
    const goal: GoalRecord = {
      id: randomUUID(),
      userId: user.id,
      name: parsed.name,
      targetAmountCents: parsed.targetAmountCents,
      currentAmountCents: parsed.currentAmountCents,
      targetDate: parsed.targetDate,
      linkedAccountId: null,
      savedPlan: null,
      savedPlanAt: null,
      planStale: false,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.createGoal(goal);
    return toPublicGoal(goal);
  }

  async update(
    user: UserRecord,
    id: string,
    input: {
      name?: unknown;
      targetAmount?: unknown;
      targetDate?: unknown;
      currentAmount?: unknown;
      linkedAccountId?: unknown;
    },
  ) {
    requireActiveAccount(user);
    const existing = await this.store.getGoal(id, user.id);
    if (!existing) {
      throw new ApiError(404, "That goal was not found.");
    }
    const parsed = this.parseGoal(input, {
      requireName: input.name !== undefined,
      requireTarget:
        input.targetAmount !== undefined || input.targetDate !== undefined,
      existing,
    });

    let linkedAccountId = existing.linkedAccountId;
    let currentAmountCents =
      input.currentAmount === undefined
        ? existing.currentAmountCents
        : parsed.currentAmountCents;

    if (input.linkedAccountId !== undefined) {
      if (input.linkedAccountId === null || input.linkedAccountId === "") {
        linkedAccountId = null;
      } else if (typeof input.linkedAccountId === "string") {
        const account = await this.store.getBankAccount(
          input.linkedAccountId,
          user.id,
        );
        if (!account) {
          throw new ApiError(400, "That bank account was not found.", {
            linkedAccountId: "Choose a connected savings account.",
          });
        }
        if (account.accountType !== "savings" && account.accountType !== "checking") {
          throw new ApiError(
            400,
            "Link a checking or savings account to this goal.",
            { linkedAccountId: "Pick a checking or savings account." },
          );
        }
        linkedAccountId = account.id;
        currentAmountCents = Math.max(0, account.balanceCents);
      }
    }

    const now = new Date().toISOString();
    const nextTargetAmount = parsed.targetAmountCents;
    const nextTargetDate = parsed.targetDate || existing.targetDate;
    const targetChanged =
      nextTargetAmount !== existing.targetAmountCents ||
      nextTargetDate !== existing.targetDate;
    const updated: GoalRecord = {
      ...existing,
      name: parsed.name || existing.name,
      targetAmountCents: nextTargetAmount,
      currentAmountCents,
      targetDate: nextTargetDate,
      linkedAccountId,
      planStale: targetChanged && existing.savedPlan != null ? true : existing.planStale,
      updatedAt: now,
    };
    if (targetChanged) {
      await this.store.createGoalChange({
        id: randomUUID(),
        goalId: existing.id,
        userId: user.id,
        oldTargetAmountCents: existing.targetAmountCents,
        newTargetAmountCents: nextTargetAmount,
        oldTargetDate: existing.targetDate,
        newTargetDate: nextTargetDate,
        note: null,
        changedAt: now,
      });
    }
    await this.store.updateGoal(updated);
    return toPublicGoal(
      updated,
      linkedAccountId ? currentAmountCents : null,
    );
  }

  async suggestions(user: UserRecord, id: string, refresh = false) {
    requireActiveAccount(user);
    const key = `${user.id}:${id}`;
    const locks = suggestionLocks();
    const pending = locks.get(key);
    if (pending) {
      await pending;
      return this.readSuggestions(user, id, false);
    }
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(key, gate);
    try {
      return await this.readSuggestions(user, id, refresh);
    } finally {
      locks.delete(key);
      release();
    }
  }

  private async readSuggestions(user: UserRecord, id: string, refresh: boolean) {
    const loaded = await this.loadGoal(user, id);
    if (loaded.pace !== "behind") {
      return { pace: loaded.pace, suggestions: [], accepted: null, spending: null, source: null };
    }
    const basis = `${loaded.goal.targetAmountCents}|${loaded.goal.targetDate}`;
    return this.loadSuggestions(user, id, loaded, basis, refresh);
  }

  private async loadSuggestions(
    user: UserRecord,
    id: string,
    loaded: { goal: GoalRecord; savedCents: number; pace: PublicGoal["pace"] },
    basis: string,
    refresh: boolean,
  ) {
    const existing = await this.store.listGoalSuggestions(user.id, id);
    const open = existing.filter((item) => item.status === "open");
    const spending = await recentSpending(this.store, user.id);
    if (!refresh && open.length > 0) {
      const ranked = [...open].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      );
      const batch: GoalSuggestionRecord[] = [];
      for (const item of ranked) {
        if (batch.some((kept) => kept.kind === item.kind)) {
          continue;
        }
        batch.push(item);
        if (batch.length === 3) {
          break;
        }
      }
      await Promise.all(
        open
          .filter((item) => !batch.some((kept) => kept.id === item.id))
          .map((item) =>
            this.store.setGoalSuggestionStatus(item.id, user.id, "dismissed"),
          ),
      );
      return {
        pace: loaded.pace,
        suggestions: batch.map(toPublicSuggestion),
        accepted: null,
        spending: toPublicSpending(spending),
        source: null,
      };
    }
    const same = existing.filter((item) => item.basis === basis);
    if (!refresh && same.length > 0) {
      const accepted = same.find((item) => item.status === "accepted") ?? null;
      return {
        pace: loaded.pace,
        suggestions: [],
        accepted: accepted ? toPublicSuggestion(accepted) : null,
        spending: toPublicSpending(spending),
        source: null,
      };
    }

    await this.store.closeOpenGoalSuggestions(id, user.id);
    const drafts = buildCatchUpDrafts({
      currentAmountCents: loaded.savedCents,
      targetAmountCents: loaded.goal.targetAmountCents,
      targetDate: loaded.goal.targetDate,
      createdAt: loaded.goal.createdAt,
    }).slice(0, 3);
    const worded = await wordCatchUp(loaded.goal.name, drafts, spending);
    const createdAt = new Date().toISOString();
    const rows: GoalSuggestionRecord[] = worded.drafts.slice(0, 3).map((draft) => ({
      id: randomUUID(),
      userId: user.id,
      goalId: id,
      kind: draft.kind,
      title: draft.title,
      detail: draft.detail,
      effect: draft.effect,
      weeklyCents: draft.weeklyCents,
      targetAmountCents: draft.targetAmountCents,
      targetDate: draft.targetDate,
      status: "open",
      basis,
      createdAt,
    }));
    if (rows.length > 0) {
      await this.store.saveGoalSuggestions(rows);
    }
    return {
      pace: loaded.pace,
      suggestions: rows.map(toPublicSuggestion),
      accepted: null,
      spending: toPublicSpending(spending),
      source: worded.source,
    };
  }

  async acceptSuggestion(user: UserRecord, goalId: string, suggestionId: string) {
    requireActiveAccount(user);
    const suggestion = await this.requireOpenSuggestion(user.id, goalId, suggestionId);
    const changesGoal =
      suggestion.targetAmountCents != null || suggestion.targetDate != null;
    if (changesGoal) {
      await this.update(user, goalId, {
        targetAmount:
          suggestion.targetAmountCents != null
            ? suggestion.targetAmountCents / 100
            : undefined,
        targetDate: suggestion.targetDate ?? undefined,
      });
    } else {
      const goal = await this.store.getGoal(goalId, user.id);
      if (!goal) {
        throw new ApiError(404, "That goal was not found.");
      }
      await this.store.createGoalChange({
        id: randomUUID(),
        goalId,
        userId: user.id,
        oldTargetAmountCents: goal.targetAmountCents,
        newTargetAmountCents: goal.targetAmountCents,
        oldTargetDate: goal.targetDate,
        newTargetDate: goal.targetDate,
        note: suggestion.effect,
        changedAt: new Date().toISOString(),
      });
    }
    await this.store.setGoalSuggestionStatus(suggestion.id, user.id, "accepted");
    await this.store.closeOpenGoalSuggestions(goalId, user.id);
    return { accepted: true };
  }

  async dismissSuggestion(user: UserRecord, goalId: string, suggestionId: string) {
    requireActiveAccount(user);
    const suggestion = await this.requireOpenSuggestion(user.id, goalId, suggestionId);
    await this.store.setGoalSuggestionStatus(suggestion.id, user.id, "dismissed");
    return { dismissed: true };
  }

  private async requireOpenSuggestion(userId: string, goalId: string, suggestionId: string) {
    const rows = await this.store.listGoalSuggestions(userId, goalId);
    const suggestion = rows.find((item) => item.id === suggestionId);
    if (!suggestion || suggestion.status !== "open") {
      throw new ApiError(404, "That suggestion is no longer available.");
    }
    return suggestion;
  }

  private async loadGoal(user: UserRecord, id: string) {
    const goal = await this.store.getGoal(id, user.id);
    if (!goal) {
      throw new ApiError(404, "That goal was not found.");
    }
    let savedCents = goal.currentAmountCents;
    if (goal.linkedAccountId) {
      const account = await this.store.getBankAccount(goal.linkedAccountId, user.id);
      if (account) {
        savedCents = Math.max(0, account.balanceCents);
      }
    }
    const pace = goalPaceStatus({
      currentAmountCents: savedCents,
      targetAmountCents: goal.targetAmountCents,
      targetDate: goal.targetDate,
      createdAt: goal.createdAt,
    });
    return { goal, savedCents, pace };
  }

  async remove(user: UserRecord, id: string) {
    requireActiveAccount(user);
    const deleted = await this.store.deleteGoal(id, user.id);
    if (!deleted) {
      throw new ApiError(404, "That goal was not found.");
    }
  }

  async createPlan(user: UserRecord, id: string) {
    requireActiveAccount(user);
    const goal = await this.store.getGoal(id, user.id);
    if (!goal) {
      throw new ApiError(404, "That goal was not found.");
    }

    const accounts =
      typeof this.store.listBankAccounts === "function"
        ? await this.store.listBankAccounts(user.id)
        : [];
    const usedFinancialData = accounts.length > 0;
    const financialContext = usedFinancialData
      ? [
          "Connected account balances:",
          ...accounts.map(
            (account) =>
              `- ${account.name} (${account.accountType}): $${(account.balanceCents / 100).toFixed(2)}`,
          ),
          "No spending ledger is available yet.",
        ].join("\n")
      : "";

    const { generateGoalPlan } = await import("@/lib/openrouter");
    const plan = await generateGoalPlan({
      goalName: goal.name,
      amount: goal.targetAmountCents / 100,
      targetDate: goal.targetDate,
      financialContext,
      usedFinancialData,
    });

    return plan;
  }

  async savePlan(
    user: UserRecord,
    id: string,
    plan: Record<string, unknown>,
  ) {
    requireActiveAccount(user);
    const existing = await this.store.getGoal(id, user.id);
    if (!existing) {
      throw new ApiError(404, "That goal was not found.");
    }
    if (!plan || typeof plan !== "object") {
      throw new ApiError(400, "Provide a savings plan to save.");
    }
    const updated = {
      ...existing,
      savedPlan: plan,
      savedPlanAt: new Date().toISOString(),
      planStale: false,
      updatedAt: new Date().toISOString(),
    };
    await this.store.updateGoal(updated);
    return toPublicGoal(updated);
  }

  private parseGoal(
    input: {
      name?: unknown;
      targetAmount?: unknown;
      targetDate?: unknown;
      currentAmount?: unknown;
    },
    options: {
      requireName: boolean;
      requireTarget: boolean;
      existing?: GoalRecord;
    },
  ) {
    const errors: Record<string, string> = {};
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (options.requireName && !name) {
      errors.name = "Give this goal a name.";
    } else if (name.length > 80) {
      errors.name = "Keep the goal name under 80 characters.";
    }

    const targetAmountCents =
      input.targetAmount === undefined
        ? (options.existing?.targetAmountCents ?? 0)
        : dollarsToCents(input.targetAmount, "targetAmount", errors);

    if (
      options.requireTarget &&
      input.targetAmount === undefined &&
      !options.existing
    ) {
      dollarsToCents(input.targetAmount, "targetAmount", errors);
    }

    let targetDate =
      typeof input.targetDate === "string" ? input.targetDate : "";
    if (!targetDate && options.existing) {
      targetDate = options.existing.targetDate;
    }
    const parsedDate = parseDateOnly(targetDate);
    if (options.requireTarget || input.targetDate !== undefined) {
      if (!targetDate) {
        errors.targetDate = "Choose a target date.";
      } else if (!parsedDate) {
        errors.targetDate = "Enter a valid target date.";
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          errors.targetDate = "Pick a target date that has not already passed.";
        }
      }
    }

    let currentAmountCents = options.existing?.currentAmountCents ?? 0;
    if (input.currentAmount !== undefined && input.currentAmount !== "") {
      const amount =
        typeof input.currentAmount === "number"
          ? input.currentAmount
          : Number(input.currentAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.currentAmount = "Enter a valid amount saved so far.";
      } else {
        currentAmountCents = Math.round(amount * 100);
      }
    }

    if (currentAmountCents > targetAmountCents && targetAmountCents > 0) {
      errors.currentAmount = "Saved amount cannot be greater than the target.";
    }

    if (Object.keys(errors).length > 0) {
      throw new ApiError(400, "Check the highlighted fields.", errors);
    }

    return {
      name,
      targetAmountCents,
      currentAmountCents,
      targetDate,
    };
  }
}

function suggestionLocks() {
  const bag = globalThis as { savestreakSuggestionLocks?: Map<string, Promise<void>> };
  bag.savestreakSuggestionLocks ??= new Map();
  return bag.savestreakSuggestionLocks;
}

function toPublicSuggestion(suggestion: GoalSuggestionRecord) {
  return {
    id: suggestion.id,
    kind: suggestion.kind,
    title: suggestion.title,
    detail: suggestion.detail,
    effect: suggestion.effect,
  };
}

function toPublicSpending(spending: { totalCents: number; topLabel: string | null }) {
  return {
    total: spending.totalCents / 100,
    topLabel: spending.topLabel,
  };
}
