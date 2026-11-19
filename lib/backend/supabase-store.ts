import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { DataStore } from "./store";
import type {
  BankAccountRecord,
  BankAccountType,
  BankConnectionRecord,
} from "./bank-types";
import type { ExpenseCategory, ExpenseRecord } from "./expense-types";
import type { LessonRecord } from "./habit-types";
import {
  mapBadge,
  mapLesson,
  mapLessonRead,
  mapLessonSave,
  mapSavingsStreak,
  mapSnapshot,
  mapStatement,
  mapSummary,
} from "./habit-map";
import type {
  BalanceSnapshotRecord,
  LessonReadRecord,
  LessonSaveRecord,
  SavingsStreakRecord,
  StatementTransactionRecord,
  StreakWeekRecord,
  UserBadgeRecord,
  WeeklySummaryRecord,
} from "./habit-types";
import type { ChallengeParticipationRecord, LessonQuizAttemptRecord, LessonQuizRecord } from "./habit-types";
import type {
  ConsentRecord,
  ConsentResendRecord,
  GoalChangeRecord,
  GoalRecord,
  GoalSuggestionRecord,
  PasswordResetRecord,
  UserRecord,
} from "./types";
import { ApiError } from "./types";

function asDate(value: string | null | undefined) {
  return String(value ?? "").slice(0, 10);
}

function mapUser(row: Record<string, unknown>): UserRecord {
  const schoolKind = row.school_kind;
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: String(row.first_name),
    lastName: String(row.last_name ?? ""),
    dateOfBirth: asDate(row.date_of_birth as string),
    ageGroup: row.age_group as UserRecord["ageGroup"],
    status: row.status as UserRecord["status"],
    phone: String(row.phone ?? ""),
    streetAddress: String(row.street_address ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    postalCode: String(row.postal_code ?? ""),
    schoolId: String(row.school_id ?? ""),
    schoolName: String(row.school_name ?? ""),
    schoolCity: String(row.school_city ?? ""),
    schoolState: String(row.school_state ?? ""),
    schoolKind:
      schoolKind === "k12" || schoolKind === "college" ? schoolKind : "",
    createdAt: String(row.created_at),
  };
}

function mapConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    guardianEmail: String(row.guardian_email),
    token: String(row.token),
    decision: row.decision as ConsentRecord["decision"],
    decidedAt: row.decided_at ? String(row.decided_at) : null,
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : String(row.created_at),
    expiresAt: row.expires_at
      ? String(row.expires_at)
      : new Date(
          new Date(String(row.created_at)).getTime() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
  };
}

function mapGoal(row: Record<string, unknown>): GoalRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    targetAmountCents: Number(row.target_amount_cents),
    currentAmountCents: Number(row.current_amount_cents),
    targetDate: asDate(row.target_date as string),
    linkedAccountId: row.linked_account_id
      ? String(row.linked_account_id)
      : null,
    savedPlan:
      row.saved_plan && typeof row.saved_plan === "object"
        ? (row.saved_plan as Record<string, unknown>)
        : null,
    savedPlanAt: row.saved_plan_at ? String(row.saved_plan_at) : null,
    planStale: Boolean(row.plan_stale),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapBankConnection(row: Record<string, unknown>): BankConnectionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bankId: String(row.bank_id),
    bankName: String(row.bank_name),
    bankCity: String(row.bank_city ?? ""),
    bankState: String(row.bank_state ?? ""),
    domain: row.domain ? String(row.domain) : null,
    itemId: row.item_id ? String(row.item_id) : null,
    accessToken: row.access_token ? String(row.access_token) : null,
    institutionId: row.institution_id ? String(row.institution_id) : null,
    connectedAt: String(row.connected_at),
    lastRefreshedAt: String(row.last_refreshed_at),
  };
}

function mapBankAccount(row: Record<string, unknown>): BankAccountRecord {
  return {
    id: String(row.id),
    connectionId: String(row.connection_id),
    userId: String(row.user_id),
    externalId: String(row.external_id),
    name: String(row.name),
    accountType: row.account_type as BankAccountType,
    balanceCents: Number(row.balance_cents),
    currency: String(row.currency ?? "USD"),
    lastUpdatedAt: String(row.last_updated_at),
  };
}

function mapExpense(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    merchant: String(row.merchant),
    purchaseDate: asDate(row.purchase_date as string),
    amountCents: Number(row.amount_cents),
    category: row.category as ExpenseCategory,
    receiptPath: String(row.receipt_path),
    createdAt: String(row.created_at),
  };
}

function fail(error: { message?: string } | null, fallback: string): never | void {
  if (error) {
    throw new ApiError(500, error.message || fallback);
  }
}

export class SupabaseStore implements DataStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

  static connect() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    }
    return new SupabaseStore(
      createClient<Database>(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }

  async getUserByEmail(email: string) {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    fail(error, "Could not load the account.");
    return data ? mapUser(data) : null;
  }

  async getUserById(id: string) {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    fail(error, "Could not load the account.");
    return data ? mapUser(data) : null;
  }

  async createUser(user: UserRecord) {
    const { error } = await this.client.from("app_users").insert({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      date_of_birth: user.dateOfBirth,
      age_group: user.ageGroup,
      status: user.status,
      phone: user.phone,
      street_address: user.streetAddress,
      city: user.city,
      state: user.state,
      postal_code: user.postalCode,
      school_id: user.schoolId,
      school_name: user.schoolName,
      school_city: user.schoolCity,
      school_state: user.schoolState,
      school_kind: user.schoolKind,
      created_at: user.createdAt,
    });
    fail(error, "Could not create the account.");
    return user;
  }

  async updateUser(user: UserRecord) {
    const { error } = await this.client
      .from("app_users")
      .update({
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        date_of_birth: user.dateOfBirth,
        age_group: user.ageGroup,
        status: user.status,
        phone: user.phone,
        street_address: user.streetAddress,
        city: user.city,
        state: user.state,
        postal_code: user.postalCode,
        school_id: user.schoolId,
        school_name: user.schoolName,
        school_city: user.schoolCity,
        school_state: user.schoolState,
        school_kind: user.schoolKind,
      })
      .eq("id", user.id);
    fail(error, "Could not update the account.");
    return user;
  }

  async createConsent(consent: ConsentRecord) {
    const { error } = await this.client.from("consents").insert({
      id: consent.id,
      user_id: consent.userId,
      guardian_email: consent.guardianEmail,
      token: consent.token,
      decision: consent.decision,
      decided_at: consent.decidedAt,
      created_at: consent.createdAt,
      sent_at: consent.sentAt,
      expires_at: consent.expiresAt,
    });
    fail(error, "Could not create the consent request.");
    return consent;
  }

  async getConsentByToken(token: string) {
    const { data, error } = await this.client
      .from("consents")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    fail(error, "Could not load the consent request.");
    return data ? mapConsent(data) : null;
  }

  async getConsentByUserId(userId: string) {
    const { data, error } = await this.client
      .from("consents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail(error, "Could not load the consent request.");
    return data ? mapConsent(data) : null;
  }

  async updateConsent(consent: ConsentRecord) {
    const { error } = await this.client
      .from("consents")
      .update({
        guardian_email: consent.guardianEmail,
        token: consent.token,
        decision: consent.decision,
        decided_at: consent.decidedAt,
        sent_at: consent.sentAt,
        expires_at: consent.expiresAt,
      })
      .eq("id", consent.id);
    fail(error, "Could not update the consent request.");
    return consent;
  }

  async listGoals(userId: string) {
    const { data, error } = await this.client
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    fail(error, "Could not load savings goals.");
    return (data ?? []).map(mapGoal);
  }

  async getGoal(id: string, userId: string) {
    const { data, error } = await this.client
      .from("goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    fail(error, "Could not load that goal.");
    return data ? mapGoal(data) : null;
  }

  async createGoal(goal: GoalRecord) {
    const { error } = await this.client.from("goals").insert({
      id: goal.id,
      user_id: goal.userId,
      name: goal.name,
      target_amount_cents: goal.targetAmountCents,
      current_amount_cents: goal.currentAmountCents,
      target_date: goal.targetDate,
      linked_account_id: goal.linkedAccountId,
      saved_plan: goal.savedPlan,
      saved_plan_at: goal.savedPlanAt,
      plan_stale: goal.planStale,
      created_at: goal.createdAt,
      updated_at: goal.updatedAt,
    });
    fail(error, "Could not create the goal.");
    return goal;
  }

  async updateGoal(goal: GoalRecord) {
    const { error } = await this.client
      .from("goals")
      .update({
        user_id: goal.userId,
        name: goal.name,
        target_amount_cents: goal.targetAmountCents,
        current_amount_cents: goal.currentAmountCents,
        target_date: goal.targetDate,
        linked_account_id: goal.linkedAccountId,
        saved_plan: goal.savedPlan,
        saved_plan_at: goal.savedPlanAt,
        plan_stale: goal.planStale,
        updated_at: goal.updatedAt,
      })
      .eq("id", goal.id);
    fail(error, "Could not update the goal.");
    return goal;
  }

  async deleteGoal(id: string, userId: string) {
    const { data, error } = await this.client
      .from("goals")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    fail(error, "Could not delete the goal.");
    return (data ?? []).length > 0;
  }

  async listBankConnections(userId: string) {
    const { data, error } = await this.client
      .from("bank_connections")
      .select("*")
      .eq("user_id", userId)
      .order("connected_at", { ascending: false });
    fail(error, "Could not load bank connections.");
    return (data ?? []).map(mapBankConnection);
  }

  async getBankConnection(id: string, userId: string) {
    const { data, error } = await this.client
      .from("bank_connections")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    fail(error, "Could not load that bank connection.");
    return data ? mapBankConnection(data) : null;
  }

  async createBankConnection(connection: BankConnectionRecord) {
    const { error } = await this.client.from("bank_connections").insert({
      id: connection.id,
      user_id: connection.userId,
      bank_id: connection.bankId,
      bank_name: connection.bankName,
      bank_city: connection.bankCity,
      bank_state: connection.bankState,
      domain: connection.domain,
      item_id: connection.itemId,
      access_token: connection.accessToken,
      institution_id: connection.institutionId,
      connected_at: connection.connectedAt,
      last_refreshed_at: connection.lastRefreshedAt,
    });
    fail(error, "Could not connect that bank.");
    return connection;
  }

  async updateBankConnection(connection: BankConnectionRecord) {
    const { error } = await this.client
      .from("bank_connections")
      .update({
        bank_name: connection.bankName,
        bank_city: connection.bankCity,
        bank_state: connection.bankState,
        domain: connection.domain,
        item_id: connection.itemId,
        access_token: connection.accessToken,
        institution_id: connection.institutionId,
        last_refreshed_at: connection.lastRefreshedAt,
      })
      .eq("id", connection.id);
    fail(error, "Could not update that bank connection.");
    return connection;
  }

  async deleteBankConnection(id: string, userId: string) {
    const { data, error } = await this.client
      .from("bank_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    fail(error, "Could not disconnect that bank.");
    return (data ?? []).length > 0;
  }

  async listBankAccounts(userId: string) {
    const { data, error } = await this.client
      .from("bank_accounts")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });
    fail(error, "Could not load bank accounts.");
    return (data ?? []).map(mapBankAccount);
  }

  async listBankAccountsByConnection(connectionId: string) {
    const { data, error } = await this.client
      .from("bank_accounts")
      .select("*")
      .eq("connection_id", connectionId)
      .order("name", { ascending: true });
    fail(error, "Could not load bank accounts.");
    return (data ?? []).map(mapBankAccount);
  }

  async getBankAccount(id: string, userId: string) {
    const { data, error } = await this.client
      .from("bank_accounts")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    fail(error, "Could not load that bank account.");
    return data ? mapBankAccount(data) : null;
  }

  async replaceBankAccounts(
    connectionId: string,
    accounts: BankAccountRecord[],
  ) {
    const { error: deleteError } = await this.client
      .from("bank_accounts")
      .delete()
      .eq("connection_id", connectionId);
    fail(deleteError, "Could not reset bank account balances.");

    if (accounts.length === 0) {
      return accounts;
    }

    const { error } = await this.client.from("bank_accounts").insert(
      accounts.map((account) => ({
        id: account.id,
        connection_id: account.connectionId,
        user_id: account.userId,
        external_id: account.externalId,
        name: account.name,
        account_type: account.accountType,
        balance_cents: account.balanceCents,
        currency: account.currency,
        last_updated_at: account.lastUpdatedAt,
      })),
    );
    fail(error, "Could not save bank account balances.");
    return accounts;
  }

  async listExpenses(userId: string) {
    const { data, error } = await this.client
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    fail(error, "Could not load expenses.");
    return (data ?? []).map(mapExpense);
  }

  async createExpense(expense: ExpenseRecord) {
    const { error } = await this.client.from("expenses").insert({
      id: expense.id,
      user_id: expense.userId,
      merchant: expense.merchant,
      purchase_date: expense.purchaseDate,
      amount_cents: expense.amountCents,
      category: expense.category,
      receipt_path: expense.receiptPath,
      created_at: expense.createdAt,
    });
    fail(error, "Could not save the expense.");
    return expense;
  }

  async deleteExpense(id: string, userId: string) {
    const { data, error } = await this.client
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    fail(error, "Could not delete the expense.");
    return (data ?? []).length > 0;
  }

  async uploadReceipt(
    userId: string,
    expenseId: string,
    bytes: Buffer,
    mimeType: string,
  ) {
    const extension = mimeType.split("/")[1] || "jpg";
    const path = `${userId}/${expenseId}.${extension}`;
    const { error } = await this.client.storage
      .from("receipts")
      .upload(path, bytes, { contentType: mimeType, upsert: true });
    fail(error, "Could not store the receipt image.");
    return path;
  }

  async getReceiptSignedUrl(path: string) {
    const { data, error } = await this.client.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 30);
    if (error) {
      return null;
    }
    return data.signedUrl;
  }

  async listBalanceSnapshots(userId: string) {
    const { data, error } = await this.client
      .from("balance_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("captured_at", { ascending: true });
    fail(error, "Could not load balance history.");
    return (data ?? []).map((row) => mapSnapshot(row));
  }

  async addBalanceSnapshot(snapshot: BalanceSnapshotRecord) {
    const { error } = await this.client.from("balance_snapshots").insert({
      id: snapshot.id,
      user_id: snapshot.userId,
      captured_at: snapshot.capturedAt,
      savings_cents: snapshot.savingsCents,
      assets_cents: snapshot.assetsCents,
      debts_cents: snapshot.debtsCents,
      net_worth_cents: snapshot.netWorthCents,
    });
    fail(error, "Could not save the savings snapshot.");
    return snapshot;
  }

  async replaceStreakWeeks(userId: string, weeks: StreakWeekRecord[]) {
    const { error: deleteError } = await this.client
      .from("streak_weeks")
      .delete()
      .eq("user_id", userId);
    fail(deleteError, "Could not reset streak history.");
    if (weeks.length === 0) {
      return;
    }
    const { error } = await this.client.from("streak_weeks").insert(
      weeks.map((week) => ({
        user_id: userId,
        week_start: week.weekStart,
        increased: week.increased,
        start_cents: week.startCents,
        end_cents: week.endCents,
      })),
    );
    fail(error, "Could not save streak history.");
  }

  async getSavingsStreak(userId: string) {
    const { data, error } = await this.client
      .from("savings_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    fail(error, "Could not load the savings streak.");
    return data ? mapSavingsStreak(data) : null;
  }

  async saveSavingsStreak(streak: SavingsStreakRecord) {
    const { error } = await this.client.from("savings_streaks").upsert({
      user_id: streak.userId,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      updated_at: streak.updatedAt,
    });
    fail(error, "Could not save the savings streak.");
    return streak;
  }

  async listStatementTransactions(userId: string) {
    const { data, error } = await this.client
      .from("statement_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("purchase_date", { ascending: false });
    fail(error, "Could not load statement transactions.");
    return (data ?? []).map((row) => mapStatement(row));
  }

  async createStatementTransactions(rows: StatementTransactionRecord[]) {
    if (rows.length === 0) {
      return;
    }
    const { error } = await this.client.from("statement_transactions").insert(
      rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        merchant: row.merchant,
        purchase_date: row.purchaseDate,
        amount_cents: row.amountCents,
        category: row.category,
        created_at: row.createdAt,
      })),
    );
    fail(error, "Could not save statement transactions.");
  }

  async listLessons() {
    const { data, error } = await this.client
      .from("lessons")
      .select("*")
      .order("id", { ascending: true });
    fail(error, "Could not load lessons.");
    return (data ?? []).map((row) => mapLesson(row));
  }

  async saveLessons(lessons: LessonRecord[]) {
    const { error } = await this.client.from("lessons").upsert(
      lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        body: lesson.body,
        takeaway: lesson.takeaway,
        topics: lesson.topics,
        minutes: lesson.minutes,
        youtube_url: lesson.youtubeUrl,
        youtube_label: lesson.youtubeLabel,
        context_key: lesson.contextKey,
      })),
    );
    fail(error, "Could not save lessons.");
  }

  async listLessonReads(userId: string) {
    const { data, error } = await this.client
      .from("lesson_reads")
      .select("*")
      .eq("user_id", userId);
    fail(error, "Could not load lesson progress.");
    return (data ?? []).map((row) => mapLessonRead(row));
  }

  async markLessonRead(read: LessonReadRecord) {
    const { error } = await this.client.from("lesson_reads").upsert({
      user_id: read.userId,
      lesson_id: read.lessonId,
      read_at: read.readAt,
    });
    fail(error, "Could not save the lesson.");
  }

  async listLessonSaves(userId: string) {
    const { data, error } = await this.client
      .from("lesson_saves")
      .select("*")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false });
    fail(error, "Could not load saved lessons.");
    return (data ?? []).map((row) => mapLessonSave(row));
  }

  async setLessonSaved(save: LessonSaveRecord, saved: boolean) {
    if (!saved) {
      const { error } = await this.client
        .from("lesson_saves")
        .delete()
        .eq("user_id", save.userId)
        .eq("lesson_id", save.lessonId);
      fail(error, "Could not update the saved lesson.");
      return;
    }
    const { error } = await this.client.from("lesson_saves").upsert({
      user_id: save.userId,
      lesson_id: save.lessonId,
      saved_at: save.savedAt,
    });
    fail(error, "Could not save the lesson.");
  }

  async listUserBadges(userId: string) {
    const { data, error } = await this.client
      .from("user_badges")
      .select("*")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });
    fail(error, "Could not load badges.");
    return (data ?? []).map((row) => mapBadge(row));
  }

  async awardBadge(badge: UserBadgeRecord) {
    const { data, error } = await this.client
      .from("user_badges")
      .upsert(
        {
          user_id: badge.userId,
          badge_id: badge.badgeId,
          earned_at: badge.earnedAt,
        },
        { onConflict: "user_id,badge_id", ignoreDuplicates: true },
      )
      .select("badge_id");
    fail(error, "Could not save the badge.");
    return (data ?? []).length > 0;
  }

  async listWeeklySummaries(userId: string) {
    const { data, error } = await this.client
      .from("weekly_summaries")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });
    fail(error, "Could not load weekly summaries.");
    return (data ?? []).map((row) => mapSummary(row));
  }

  async getWeeklySummary(userId: string, weekStart: string) {
    const { data, error } = await this.client
      .from("weekly_summaries")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();
    fail(error, "Could not load that weekly summary.");
    return data ? mapSummary(data) : null;
  }

  async saveWeeklySummary(summary: WeeklySummaryRecord) {
    const { error } = await this.client.from("weekly_summaries").upsert({
      id: summary.id,
      user_id: summary.userId,
      week_start: summary.weekStart,
      spending_cents: summary.spendingCents,
      previous_spending_cents: summary.previousSpendingCents,
      top_categories: summary.topCategories,
      goal_note: summary.goalNote,
      streak_note: summary.streakNote,
      tip: summary.tip,
      body: summary.body,
      had_activity: summary.hadActivity,
      source: summary.source,
      created_at: summary.createdAt,
    });
    fail(error, "Could not save the weekly summary.");
    return summary;
  }

  async createPasswordReset(reset: PasswordResetRecord) {
    const { error } = await this.client.from("password_resets").insert({
      id: reset.id,
      user_id: reset.userId,
      token_hash: reset.tokenHash,
      expires_at: reset.expiresAt,
      used_at: reset.usedAt,
      created_at: reset.createdAt,
    });
    fail(error, "Could not start the password reset.");
  }

  async invalidateOpenPasswordResets(userId: string) {
    const { error } = await this.client
      .from("password_resets")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);
    fail(error, "Could not start the password reset.");
  }

  async claimPasswordReset(tokenHash: string, usedAt: string) {
    const { data, error } = await this.client
      .from("password_resets")
      .update({ used_at: usedAt })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("*")
      .maybeSingle();
    fail(error, "Could not use that reset link.");
    if (data) {
      return { status: "ok" as const, reset: mapPasswordReset(data) };
    }
    const existing = await this.client
      .from("password_resets")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    fail(existing.error, "Could not use that reset link.");
    if (!existing.data) {
      return { status: "missing" as const };
    }
    if (existing.data.used_at) {
      return { status: "used" as const };
    }
    return { status: "expired" as const };
  }

  async releasePasswordReset(id: string) {
    const { error } = await this.client
      .from("password_resets")
      .update({ used_at: null })
      .eq("id", id);
    fail(error, "Could not use that reset link.");
  }

  async countConsentResends(userId: string, since: string) {
    const { count, error } = await this.client
      .from("consent_resends")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sent_at", since);
    fail(error, "Could not check consent emails.");
    return count ?? 0;
  }

  async createConsentResend(record: ConsentResendRecord) {
    const { error } = await this.client.from("consent_resends").insert({
      id: record.id,
      user_id: record.userId,
      consent_id: record.consentId,
      guardian_email: record.guardianEmail,
      sent_at: record.sentAt,
    });
    fail(error, "Could not record the consent email.");
  }

  async listGoalChanges(userId: string) {
    const { data, error } = await this.client
      .from("goal_changes")
      .select("*")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false });
    fail(error, "Could not load goal history.");
    return (data ?? []).map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      userId: row.user_id,
      oldTargetAmountCents: row.old_target_amount_cents,
      newTargetAmountCents: row.new_target_amount_cents,
      oldTargetDate: String(row.old_target_date).slice(0, 10),
      newTargetDate: String(row.new_target_date).slice(0, 10),
      note: row.note == null ? null : String(row.note),
      changedAt: row.changed_at,
    }));
  }

  async createGoalChange(change: GoalChangeRecord) {
    const { error } = await this.client.from("goal_changes").insert({
      id: change.id,
      goal_id: change.goalId,
      user_id: change.userId,
      old_target_amount_cents: change.oldTargetAmountCents,
      new_target_amount_cents: change.newTargetAmountCents,
      old_target_date: change.oldTargetDate,
      new_target_date: change.newTargetDate,
      note: change.note,
      changed_at: change.changedAt,
    });
    fail(error, "Could not record the goal change.");
  }

  async listGoalSuggestions(userId: string, goalId: string) {
    const { data, error } = await this.client
      .from("goal_suggestions")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("created_at", { ascending: true });
    fail(error, "Could not load catch-up suggestions.");
    return (data ?? []).map(mapGoalSuggestion);
  }

  async saveGoalSuggestions(rows: GoalSuggestionRecord[]) {
    if (rows.length === 0) {
      return;
    }
    const { error } = await this.client.from("goal_suggestions").insert(
      rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        goal_id: row.goalId,
        kind: row.kind,
        title: row.title,
        detail: row.detail,
        effect: row.effect,
        weekly_cents: row.weeklyCents,
        target_amount_cents: row.targetAmountCents,
        target_date: row.targetDate,
        status: row.status,
        basis: row.basis,
        created_at: row.createdAt,
      })),
    );
    fail(error, "Could not save catch-up suggestions.");
  }

  async closeOpenGoalSuggestions(goalId: string, userId: string) {
    const { error } = await this.client
      .from("goal_suggestions")
      .update({ status: "dismissed" })
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .eq("status", "open");
    fail(error, "Could not update catch-up suggestions.");
  }

  async setGoalSuggestionStatus(
    id: string,
    userId: string,
    status: GoalSuggestionRecord["status"],
  ) {
    const { data, error } = await this.client
      .from("goal_suggestions")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    fail(error, "Could not update that suggestion.");
    return data ? mapGoalSuggestion(data) : null;
  }

  async listChallengeParticipations(userId: string) {
    const { data, error } = await this.client
      .from("challenge_participations")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false });
    fail(error, "Could not load challenges.");
    return (data ?? []).map(mapChallengeParticipation);
  }

  async createChallengeParticipation(row: ChallengeParticipationRecord) {
    const { error } = await this.client.from("challenge_participations").insert({
      id: row.id,
      user_id: row.userId,
      week_start: row.weekStart,
      challenge_id: row.challengeId,
      joined_at: row.joinedAt,
      status: row.status,
      progress_cents: row.progressCents,
      measured: row.measured,
      closed_at: row.closedAt,
    });
    fail(error, "Could not join that challenge.");
    return row;
  }

  async updateChallengeParticipation(row: ChallengeParticipationRecord) {
    const { error } = await this.client
      .from("challenge_participations")
      .update({
        status: row.status,
        progress_cents: row.progressCents,
        measured: row.measured,
        closed_at: row.closedAt,
      })
      .eq("id", row.id)
      .eq("user_id", row.userId);
    fail(error, "Could not update that challenge.");
    return row;
  }

  async saveLessonQuizzes(quizzes: LessonQuizRecord[]) {
    const quizRows = quizzes.map((quiz) => ({
      id: quiz.id,
      lesson_id: quiz.lessonId,
      topics: quiz.topics,
      pass_percent: quiz.passPercent,
    }));
    const savedQuizzes = await this.client.from("lesson_quizzes").upsert(quizRows);
    fail(savedQuizzes.error, "Could not save lesson quizzes.");
    const questions = quizzes.flatMap((quiz) =>
      quiz.questions.map((question, index) => ({
        id: question.id,
        quiz_id: quiz.id,
        position: index + 1,
        prompt: question.prompt,
        choices: question.choices,
        correct_index: question.correctIndex,
        explanation: question.explanation,
      })),
    );
    const savedQuestions = await this.client.from("lesson_quiz_questions").upsert(questions);
    fail(savedQuestions.error, "Could not save quiz questions.");
  }

  async listLessonQuizAttempts(userId: string, lessonId: string) {
    const { data, error } = await this.client
      .from("lesson_quiz_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });
    fail(error, "Could not load quiz attempts.");
    return (data ?? []).map(mapLessonQuizAttempt);
  }

  async createLessonQuizAttempt(row: LessonQuizAttemptRecord) {
    const { error } = await this.client.from("lesson_quiz_attempts").insert({
      id: row.id,
      user_id: row.userId,
      lesson_id: row.lessonId,
      quiz_id: row.quizId,
      score: row.score,
      total: row.total,
      passed: row.passed,
      answers: row.answers,
      created_at: row.createdAt,
    });
    fail(error, "Could not save that quiz attempt.");
    return row;
  }
}

function mapGoalSuggestion(row: {
  id: string;
  user_id: string;
  goal_id: string;
  kind: string;
  title: string;
  detail: string;
  effect: string;
  weekly_cents: number;
  target_amount_cents: number | null;
  target_date: string | null;
  status: string;
  basis: string;
  created_at: string;
}): GoalSuggestionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    kind: row.kind as GoalSuggestionRecord["kind"],
    title: row.title,
    detail: row.detail,
    effect: row.effect,
    weeklyCents: row.weekly_cents,
    targetAmountCents: row.target_amount_cents,
    targetDate: row.target_date ? String(row.target_date).slice(0, 10) : null,
    status: row.status as GoalSuggestionRecord["status"],
    basis: row.basis,
    createdAt: row.created_at,
  };
}

function mapLessonQuizAttempt(
  row: Database["public"]["Tables"]["lesson_quiz_attempts"]["Row"],
): LessonQuizAttemptRecord {
  return {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    quizId: row.quiz_id,
    score: row.score,
    total: row.total,
    passed: row.passed,
    answers: Array.isArray(row.answers) ? row.answers.map(Number) : [],
    createdAt: row.created_at,
  };
}

function mapChallengeParticipation(row: {
  id: string;
  user_id: string;
  week_start: string;
  challenge_id: string;
  joined_at: string;
  status: string;
  progress_cents: number;
  measured: boolean;
  closed_at: string | null;
}): ChallengeParticipationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    weekStart: String(row.week_start).slice(0, 10),
    challengeId: row.challenge_id,
    joinedAt: row.joined_at,
    status: row.status as ChallengeParticipationRecord["status"],
    progressCents: row.progress_cents,
    measured: row.measured,
    closedAt: row.closed_at,
  };
}

function mapPasswordReset(row: {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}): PasswordResetRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}
