import { randomUUID } from "node:crypto";
import { parseDateOnly } from "./auth-service";
import type { DataStore } from "./store";
import {
  goalIsComplete,
  goalPaceStatus,
  goalProgressPercent,
  goalRemainingCents,
} from "@/lib/goal-progress";
import {
  ApiError,
  type GoalRecord,
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
    const goals = await this.store.listGoals(user.id);
    const accounts =
      typeof this.store.listBankAccounts === "function"
        ? await this.store.listBankAccounts(user.id)
        : [];
    const balanceById = new Map(
      accounts.map((account) => [account.id, account.balanceCents]),
    );
    return goals.map((goal) =>
      toPublicGoal(
        goal,
        goal.linkedAccountId
          ? (balanceById.get(goal.linkedAccountId) ?? null)
          : null,
      ),
    );
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

    const updated: GoalRecord = {
      ...existing,
      name: parsed.name || existing.name,
      targetAmountCents: parsed.targetAmountCents,
      currentAmountCents,
      targetDate: parsed.targetDate || existing.targetDate,
      linkedAccountId,
      updatedAt: new Date().toISOString(),
    };
    await this.store.updateGoal(updated);
    return toPublicGoal(
      updated,
      linkedAccountId ? currentAmountCents : null,
    );
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
