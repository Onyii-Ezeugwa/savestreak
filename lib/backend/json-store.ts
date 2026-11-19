import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataStore } from "./store";
import type {
  BankAccountRecord,
  BankConnectionRecord,
} from "./bank-types";
import type { ExpenseRecord } from "./expense-types";
import type {
  BalanceSnapshotRecord,
  ChallengeParticipationRecord,
  LessonQuizAttemptRecord,
  LessonQuizRecord,
  LessonReadRecord,
  LessonRecord,
  LessonSaveRecord,
  SavingsStreakRecord,
  StatementTransactionRecord,
  StreakWeekRecord,
  UserBadgeRecord,
  WeeklySummaryRecord,
} from "./habit-types";
import { consentExpiresAt } from "./consent-rules";
import type {
  ConsentRecord,
  ConsentResendRecord,
  GoalChangeRecord,
  GoalRecord,
  GoalSuggestionRecord,
  PasswordResetRecord,
  UserRecord,
} from "./types";

interface Snapshot {
  users: UserRecord[];
  consents: ConsentRecord[];
  goals: GoalRecord[];
  bankConnections: BankConnectionRecord[];
  bankAccounts: BankAccountRecord[];
  expenses: ExpenseRecord[];
  balanceSnapshots: BalanceSnapshotRecord[];
  streakWeeks: StreakWeekRecord[];
  savingsStreaks: SavingsStreakRecord[];
  statementTransactions: StatementTransactionRecord[];
  lessons: LessonRecord[];
  lessonReads: LessonReadRecord[];
  lessonSaves: LessonSaveRecord[];
  passwordResets: PasswordResetRecord[];
  consentResends: ConsentResendRecord[];
  goalChanges: GoalChangeRecord[];
  goalSuggestions: GoalSuggestionRecord[];
  userBadges: UserBadgeRecord[];
  weeklySummaries: WeeklySummaryRecord[];
  challengeParticipations: ChallengeParticipationRecord[];
  lessonQuizzes: LessonQuizRecord[];
  lessonQuizAttempts: LessonQuizAttemptRecord[];
}

export class JsonStore implements DataStore {
  private snapshot: Snapshot = {
    users: [],
    consents: [],
    goals: [],
    bankConnections: [],
    bankAccounts: [],
    expenses: [],
    balanceSnapshots: [],
    streakWeeks: [],
    savingsStreaks: [],
    statementTransactions: [],
    lessons: [],
    lessonReads: [],
    lessonSaves: [],
    passwordResets: [],
    consentResends: [],
    goalChanges: [],
    goalSuggestions: [],
    userBadges: [],
    weeklySummaries: [],
    challengeParticipations: [],
    lessonQuizzes: [],
    lessonQuizAttempts: [],
  };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<Snapshot>;
      this.snapshot = {
        users: parsed.users ?? [],
        consents: (parsed.consents ?? []).map((consent) => ({
          ...consent,
          sentAt: consent.sentAt ?? consent.createdAt,
          expiresAt: consentExpiresAt(consent.createdAt, consent.expiresAt),
        })),
        goals: (parsed.goals ?? []).map((goal) => ({
          ...goal,
          linkedAccountId: goal.linkedAccountId ?? null,
          savedPlan: goal.savedPlan ?? null,
          savedPlanAt: goal.savedPlanAt ?? null,
          planStale: goal.planStale ?? false,
        })),
        bankConnections: (parsed.bankConnections ?? []).map((connection) => ({
          ...connection,
          domain: connection.domain ?? null,
          itemId: connection.itemId ?? null,
          accessToken: connection.accessToken ?? null,
          institutionId: connection.institutionId ?? null,
        })),
        bankAccounts: parsed.bankAccounts ?? [],
        expenses: parsed.expenses ?? [],
        streakWeeks: parsed.streakWeeks ?? [],
        savingsStreaks: parsed.savingsStreaks ?? [],
        statementTransactions: parsed.statementTransactions ?? [],
        lessons: parsed.lessons ?? [],
        lessonReads: parsed.lessonReads ?? [],
        lessonSaves: parsed.lessonSaves ?? [],
        passwordResets: parsed.passwordResets ?? [],
        consentResends: parsed.consentResends ?? [],
        goalChanges: parsed.goalChanges ?? [],
        goalSuggestions: parsed.goalSuggestions ?? [],
        balanceSnapshots: (parsed.balanceSnapshots ?? []).map((snapshot) => ({
          ...snapshot,
          assetsCents: snapshot.assetsCents ?? null,
          debtsCents: snapshot.debtsCents ?? null,
          netWorthCents: snapshot.netWorthCents ?? null,
        })),
        userBadges: parsed.userBadges ?? [],
        weeklySummaries: parsed.weeklySummaries ?? [],
        challengeParticipations: parsed.challengeParticipations ?? [],
        lessonQuizzes: parsed.lessonQuizzes ?? [],
        lessonQuizAttempts: parsed.lessonQuizAttempts ?? [],
      };
    } catch {
      await this.persist();
    }
  }

  private async persist() {
    this.writeQueue = this.writeQueue.then(async () => {
      await writeFile(this.filePath, JSON.stringify(this.snapshot, null, 2));
    });
    await this.writeQueue;
  }

  async getUserByEmail(email: string) {
    return (
      this.snapshot.users.find(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }

  async getUserById(id: string) {
    return this.snapshot.users.find((user) => user.id === id) ?? null;
  }

  async createUser(user: UserRecord) {
    this.snapshot.users = this.snapshot.users.filter((item) => item.id !== user.id);
    this.snapshot.users.push(user);
    await this.persist();
    return user;
  }

  async updateUser(user: UserRecord) {
    this.snapshot.users = this.snapshot.users.map((item) =>
      item.id === user.id ? user : item,
    );
    await this.persist();
    return user;
  }

  async createConsent(consent: ConsentRecord) {
    this.snapshot.consents.push(consent);
    await this.persist();
    return consent;
  }

  async getConsentByToken(token: string) {
    return this.snapshot.consents.find((item) => item.token === token) ?? null;
  }

  async getConsentByUserId(userId: string) {
    return this.snapshot.consents.find((item) => item.userId === userId) ?? null;
  }

  async updateConsent(consent: ConsentRecord) {
    this.snapshot.consents = this.snapshot.consents.map((item) =>
      item.id === consent.id ? consent : item,
    );
    await this.persist();
    return consent;
  }

  async countConsentResends(userId: string, since: string) {
    return this.snapshot.consentResends.filter(
      (item) => item.userId === userId && item.sentAt >= since,
    ).length;
  }

  async createConsentResend(record: ConsentResendRecord) {
    this.snapshot.consentResends.push(record);
    await this.persist();
  }

  async listGoalChanges(userId: string) {
    return this.snapshot.goalChanges
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }

  async createGoalChange(change: GoalChangeRecord) {
    this.snapshot.goalChanges.push(change);
    await this.persist();
  }

  async listGoalSuggestions(userId: string, goalId: string) {
    return this.snapshot.goalSuggestions
      .filter((item) => item.userId === userId && item.goalId === goalId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async saveGoalSuggestions(rows: GoalSuggestionRecord[]) {
    this.snapshot.goalSuggestions.push(...rows);
    await this.persist();
  }

  async closeOpenGoalSuggestions(goalId: string, userId: string) {
    this.snapshot.goalSuggestions = this.snapshot.goalSuggestions.map((item) =>
      item.goalId === goalId && item.userId === userId && item.status === "open"
        ? { ...item, status: "dismissed" }
        : item,
    );
    await this.persist();
  }

  async setGoalSuggestionStatus(
    id: string,
    userId: string,
    status: GoalSuggestionRecord["status"],
  ) {
    const index = this.snapshot.goalSuggestions.findIndex(
      (item) => item.id === id && item.userId === userId,
    );
    if (index === -1) {
      return null;
    }
    const next = { ...this.snapshot.goalSuggestions[index]!, status };
    this.snapshot.goalSuggestions[index] = next;
    await this.persist();
    return next;
  }

  async listChallengeParticipations(userId: string) {
    return this.snapshot.challengeParticipations
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  async createChallengeParticipation(row: ChallengeParticipationRecord) {
    this.snapshot.challengeParticipations.push(row);
    await this.persist();
    return row;
  }

  async updateChallengeParticipation(row: ChallengeParticipationRecord) {
    this.snapshot.challengeParticipations = this.snapshot.challengeParticipations.map(
      (item) => (item.id === row.id ? row : item),
    );
    await this.persist();
    return row;
  }

  async listGoals(userId: string) {
    return this.snapshot.goals
      .filter((goal) => goal.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGoal(id: string, userId: string) {
    return (
      this.snapshot.goals.find(
        (goal) => goal.id === id && goal.userId === userId,
      ) ?? null
    );
  }

  async createGoal(goal: GoalRecord) {
    this.snapshot.goals.push(goal);
    await this.persist();
    return goal;
  }

  async updateGoal(goal: GoalRecord) {
    this.snapshot.goals = this.snapshot.goals.map((item) =>
      item.id === goal.id ? goal : item,
    );
    await this.persist();
    return goal;
  }

  async deleteGoal(id: string, userId: string) {
    const before = this.snapshot.goals.length;
    this.snapshot.goals = this.snapshot.goals.filter(
      (goal) => !(goal.id === id && goal.userId === userId),
    );
    await this.persist();
    return this.snapshot.goals.length < before;
  }

  async listBankConnections(userId: string) {
    return this.snapshot.bankConnections
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
  }

  async getBankConnection(id: string, userId: string) {
    return (
      this.snapshot.bankConnections.find(
        (item) => item.id === id && item.userId === userId,
      ) ?? null
    );
  }

  async createBankConnection(connection: BankConnectionRecord) {
    this.snapshot.bankConnections.push(connection);
    await this.persist();
    return connection;
  }

  async updateBankConnection(connection: BankConnectionRecord) {
    this.snapshot.bankConnections = this.snapshot.bankConnections.map((item) =>
      item.id === connection.id ? connection : item,
    );
    await this.persist();
    return connection;
  }

  async deleteBankConnection(id: string, userId: string) {
    const before = this.snapshot.bankConnections.length;
    this.snapshot.bankConnections = this.snapshot.bankConnections.filter(
      (item) => !(item.id === id && item.userId === userId),
    );
    this.snapshot.bankAccounts = this.snapshot.bankAccounts.filter(
      (item) => item.connectionId !== id,
    );
    this.snapshot.goals = this.snapshot.goals.map((goal) =>
      goal.linkedAccountId &&
      !this.snapshot.bankAccounts.some((account) => account.id === goal.linkedAccountId)
        ? { ...goal, linkedAccountId: null }
        : goal,
    );
    await this.persist();
    return this.snapshot.bankConnections.length < before;
  }

  async listBankAccounts(userId: string) {
    return this.snapshot.bankAccounts
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async listBankAccountsByConnection(connectionId: string) {
    return this.snapshot.bankAccounts
      .filter((item) => item.connectionId === connectionId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBankAccount(id: string, userId: string) {
    return (
      this.snapshot.bankAccounts.find(
        (item) => item.id === id && item.userId === userId,
      ) ?? null
    );
  }

  async replaceBankAccounts(
    connectionId: string,
    accounts: BankAccountRecord[],
  ) {
    this.snapshot.bankAccounts = [
      ...this.snapshot.bankAccounts.filter(
        (item) => item.connectionId !== connectionId,
      ),
      ...accounts,
    ];
    await this.persist();
    return accounts;
  }

  async listExpenses(userId: string) {
    return this.snapshot.expenses
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createExpense(expense: ExpenseRecord) {
    this.snapshot.expenses.push(expense);
    await this.persist();
    return expense;
  }

  async deleteExpense(id: string, userId: string) {
    const before = this.snapshot.expenses.length;
    this.snapshot.expenses = this.snapshot.expenses.filter(
      (item) => !(item.id === id && item.userId === userId),
    );
    await this.persist();
    return this.snapshot.expenses.length < before;
  }

  async listBalanceSnapshots(userId: string) {
    return this.snapshot.balanceSnapshots
      .filter((item) => item.userId === userId)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  }

  async addBalanceSnapshot(snapshot: BalanceSnapshotRecord) {
    this.snapshot.balanceSnapshots.push(snapshot);
    await this.persist();
    return snapshot;
  }

  async replaceStreakWeeks(userId: string, weeks: StreakWeekRecord[]) {
    this.snapshot.streakWeeks = [
      ...this.snapshot.streakWeeks.filter((item) => item.userId !== userId),
      ...weeks,
    ];
    await this.persist();
  }

  async getSavingsStreak(userId: string) {
    return (
      this.snapshot.savingsStreaks.find((item) => item.userId === userId) ??
      null
    );
  }

  async saveSavingsStreak(streak: SavingsStreakRecord) {
    this.snapshot.savingsStreaks = [
      ...this.snapshot.savingsStreaks.filter((item) => item.userId !== streak.userId),
      streak,
    ];
    await this.persist();
    return streak;
  }

  async listStatementTransactions(userId: string) {
    return this.snapshot.statementTransactions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }

  async createStatementTransactions(rows: StatementTransactionRecord[]) {
    this.snapshot.statementTransactions.push(...rows);
    await this.persist();
  }

  async listLessons() {
    return this.snapshot.lessons;
  }

  async saveLessons(lessons: LessonRecord[]) {
    const ids = new Set(lessons.map((lesson) => lesson.id));
    this.snapshot.lessons = [
      ...this.snapshot.lessons.filter((lesson) => !ids.has(lesson.id)),
      ...lessons,
    ];
    await this.persist();
  }

  async listLessonReads(userId: string) {
    return this.snapshot.lessonReads.filter((item) => item.userId === userId);
  }

  async markLessonRead(read: LessonReadRecord) {
    this.snapshot.lessonReads = [
      ...this.snapshot.lessonReads.filter(
        (item) => !(item.userId === read.userId && item.lessonId === read.lessonId),
      ),
      read,
    ];
    await this.persist();
  }

  async createPasswordReset(reset: PasswordResetRecord) {
    this.snapshot.passwordResets.push(reset);
    await this.persist();
  }

  async invalidateOpenPasswordResets(userId: string) {
    const usedAt = new Date().toISOString();
    this.snapshot.passwordResets = this.snapshot.passwordResets.map((item) =>
      item.userId === userId && !item.usedAt ? { ...item, usedAt } : item,
    );
    await this.persist();
  }

  async claimPasswordReset(tokenHash: string, usedAt: string) {
    const reset = this.snapshot.passwordResets.find(
      (item) => item.tokenHash === tokenHash,
    );
    if (!reset) {
      return { status: "missing" as const };
    }
    if (reset.usedAt) {
      return { status: "used" as const };
    }
    if (new Date(reset.expiresAt).getTime() <= Date.now()) {
      return { status: "expired" as const };
    }
    reset.usedAt = usedAt;
    await this.persist();
    return { status: "ok" as const, reset: { ...reset } };
  }

  async releasePasswordReset(id: string) {
    const reset = this.snapshot.passwordResets.find((item) => item.id === id);
    if (reset) {
      reset.usedAt = null;
      await this.persist();
    }
  }

  async listLessonSaves(userId: string) {
    return this.snapshot.lessonSaves
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async setLessonSaved(save: LessonSaveRecord, saved: boolean) {
    this.snapshot.lessonSaves = this.snapshot.lessonSaves.filter(
      (item) => !(item.userId === save.userId && item.lessonId === save.lessonId),
    );
    if (saved) {
      this.snapshot.lessonSaves.push(save);
    }
    await this.persist();
  }

  async listUserBadges(userId: string) {
    return this.snapshot.userBadges
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
  }

  async awardBadge(badge: UserBadgeRecord) {
    const exists = this.snapshot.userBadges.some(
      (item) => item.userId === badge.userId && item.badgeId === badge.badgeId,
    );
    if (exists) {
      return false;
    }
    this.snapshot.userBadges.push(badge);
    await this.persist();
    return true;
  }

  async listWeeklySummaries(userId: string) {
    return this.snapshot.weeklySummaries
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  async getWeeklySummary(userId: string, weekStart: string) {
    return (
      this.snapshot.weeklySummaries.find(
        (item) => item.userId === userId && item.weekStart === weekStart,
      ) ?? null
    );
  }

  async saveWeeklySummary(summary: WeeklySummaryRecord) {
    this.snapshot.weeklySummaries = [
      ...this.snapshot.weeklySummaries.filter(
        (item) =>
          !(item.userId === summary.userId && item.weekStart === summary.weekStart),
      ),
      summary,
    ];
    await this.persist();
    return summary;
  }

  async saveLessonQuizzes(quizzes: LessonQuizRecord[]) {
    this.snapshot.lessonQuizzes = quizzes;
    await this.persist();
  }

  async listLessonQuizAttempts(userId: string, lessonId: string) {
    return this.snapshot.lessonQuizAttempts
      .filter((item) => item.userId === userId && item.lessonId === lessonId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createLessonQuizAttempt(row: LessonQuizAttemptRecord) {
    this.snapshot.lessonQuizAttempts.push(row);
    await this.persist();
    return row;
  }
}
