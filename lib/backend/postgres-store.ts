import pg from "pg";
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
  mapStreakWeek,
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
import {
  ApiError,
  type ConsentRecord,
  type ConsentResendRecord,
  type GoalChangeRecord,
  type GoalRecord,
  type PasswordResetRecord,
  type UserRecord,
} from "./types";

function asDate(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function asIso(value: Date | string | null) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function wrapPgError(error: unknown, fallback: string): never {
  const pgError = error as { code?: string; message?: string };
  console.error(pgError);
  if (pgError.code === "23505") {
    throw new ApiError(409, "An account with that email already exists.");
  }
  throw new ApiError(500, fallback);
}

export class PostgresStore implements DataStore {
  constructor(private readonly pool: pg.Pool) {}

  static connect(databaseUrl: string) {
    const url = databaseUrl.replace(/[?&]sslmode=[^&]+/, "");
    return new PostgresStore(
      new pg.Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        max: process.env.VERCEL ? 1 : 5,
        idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
      }),
    );
  }

  async getUserByEmail(email: string) {
    const result = await this.pool.query(
      `SELECT * FROM app_users WHERE email = $1`,
      [email.toLowerCase()],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async getUserById(id: string) {
    const result = await this.pool.query(`SELECT * FROM app_users WHERE id = $1`, [
      id,
    ]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async getAuthUserIdByEmail(email: string) {
    try {
      const result = await this.pool.query(
        `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
        [email],
      );
      return result.rows[0]?.id ? String(result.rows[0].id) : null;
    } catch (error) {
      wrapPgError(error, "Could not look up the account.");
    }
  }

  async createUser(user: UserRecord) {
    try {
      await this.pool.query(
        `INSERT INTO app_users
          (id, email, first_name, last_name, date_of_birth, age_group, status,
           phone, street_address, city, state, postal_code,
           school_id, school_name, school_city, school_state, school_kind, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (id) DO UPDATE SET
          email = excluded.email,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          date_of_birth = excluded.date_of_birth,
          age_group = excluded.age_group,
          status = excluded.status,
          phone = excluded.phone,
          street_address = excluded.street_address,
          city = excluded.city,
          state = excluded.state,
          postal_code = excluded.postal_code,
          school_id = excluded.school_id,
          school_name = excluded.school_name,
          school_city = excluded.school_city,
          school_state = excluded.school_state,
          school_kind = excluded.school_kind`,
        [
          user.id,
          user.email,
          user.firstName,
          user.lastName,
          user.dateOfBirth,
          user.ageGroup,
          user.status,
          user.phone,
          user.streetAddress,
          user.city,
          user.state,
          user.postalCode,
          user.schoolId,
          user.schoolName,
          user.schoolCity,
          user.schoolState,
          user.schoolKind,
          user.createdAt,
        ],
      );
    } catch (error) {
      wrapPgError(error, "Could not save the account.");
    }
    return user;
  }

  async updateUser(user: UserRecord) {
    await this.pool.query(
      `UPDATE app_users SET
        email = $2, first_name = $3, last_name = $4, date_of_birth = $5,
        age_group = $6, status = $7, phone = $8, street_address = $9,
        city = $10, state = $11, postal_code = $12, school_id = $13,
        school_name = $14, school_city = $15, school_state = $16, school_kind = $17
       WHERE id = $1`,
      [
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.dateOfBirth,
        user.ageGroup,
        user.status,
        user.phone,
        user.streetAddress,
        user.city,
        user.state,
        user.postalCode,
        user.schoolId,
        user.schoolName,
        user.schoolCity,
        user.schoolState,
        user.schoolKind,
      ],
    );
    return user;
  }

  async createConsent(consent: ConsentRecord) {
    await this.pool.query(
      `INSERT INTO consents
        (id, user_id, guardian_email, token, decision, decided_at, created_at, sent_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        consent.id,
        consent.userId,
        consent.guardianEmail,
        consent.token,
        consent.decision,
        consent.decidedAt,
        consent.createdAt,
        consent.sentAt,
        consent.expiresAt,
      ],
    );
    return consent;
  }

  async getConsentByToken(token: string) {
    const result = await this.pool.query(
      `SELECT * FROM consents WHERE token = $1`,
      [token],
    );
    return result.rows[0] ? mapConsent(result.rows[0]) : null;
  }

  async getConsentByUserId(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM consents WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapConsent(result.rows[0]) : null;
  }

  async updateConsent(consent: ConsentRecord) {
    await this.pool.query(
      `UPDATE consents SET
        guardian_email = $2, token = $3, decision = $4, decided_at = $5,
        sent_at = $6, expires_at = $7
       WHERE id = $1`,
      [
        consent.id,
        consent.guardianEmail,
        consent.token,
        consent.decision,
        consent.decidedAt,
        consent.sentAt,
        consent.expiresAt,
      ],
    );
    return consent;
  }

  async listGoals(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(mapGoal);
  }

  async getGoal(id: string, userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM goals WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapGoal(result.rows[0]) : null;
  }

  async createGoal(goal: GoalRecord) {
    await this.pool.query(
      `INSERT INTO goals
        (id, user_id, name, target_amount_cents, current_amount_cents, target_date, linked_account_id, saved_plan, saved_plan_at, plan_stale, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        goal.id,
        goal.userId,
        goal.name,
        goal.targetAmountCents,
        goal.currentAmountCents,
        goal.targetDate,
        goal.linkedAccountId,
        goal.savedPlan ? JSON.stringify(goal.savedPlan) : null,
        goal.savedPlanAt,
        goal.planStale,
        goal.createdAt,
        goal.updatedAt,
      ],
    );
    return goal;
  }

  async updateGoal(goal: GoalRecord) {
    await this.pool.query(
      `UPDATE goals SET
        name = $2, target_amount_cents = $3, current_amount_cents = $4,
        target_date = $5, linked_account_id = $6, saved_plan = $7,
        saved_plan_at = $8, plan_stale = $9, updated_at = $10
       WHERE id = $1`,
      [
        goal.id,
        goal.name,
        goal.targetAmountCents,
        goal.currentAmountCents,
        goal.targetDate,
        goal.linkedAccountId,
        goal.savedPlan ? JSON.stringify(goal.savedPlan) : null,
        goal.savedPlanAt,
        goal.planStale,
        goal.updatedAt,
      ],
    );
    return goal;
  }

  async deleteGoal(id: string, userId: string) {
    const result = await this.pool.query(
      `DELETE FROM goals WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listBankConnections(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM bank_connections WHERE user_id = $1 ORDER BY connected_at DESC`,
      [userId],
    );
    return result.rows.map(mapBankConnection);
  }

  async getBankConnection(id: string, userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM bank_connections WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapBankConnection(result.rows[0]) : null;
  }

  async createBankConnection(connection: BankConnectionRecord) {
    try {
      await this.pool.query(
        `INSERT INTO bank_connections
          (id, user_id, bank_id, bank_name, bank_city, bank_state, domain,
           item_id, access_token, institution_id, connected_at, last_refreshed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          connection.id,
          connection.userId,
          connection.bankId,
          connection.bankName,
          connection.bankCity,
          connection.bankState,
          connection.domain,
          connection.itemId,
          connection.accessToken,
          connection.institutionId,
          connection.connectedAt,
          connection.lastRefreshedAt,
        ],
      );
      return connection;
    } catch (error) {
      wrapPgError(error, "Could not connect that bank.");
    }
  }

  async updateBankConnection(connection: BankConnectionRecord) {
    await this.pool.query(
      `UPDATE bank_connections SET
        bank_name = $2, bank_city = $3, bank_state = $4, domain = $5,
        item_id = $6, access_token = $7, institution_id = $8,
        last_refreshed_at = $9
       WHERE id = $1`,
      [
        connection.id,
        connection.bankName,
        connection.bankCity,
        connection.bankState,
        connection.domain,
        connection.itemId,
        connection.accessToken,
        connection.institutionId,
        connection.lastRefreshedAt,
      ],
    );
    return connection;
  }

  async deleteBankConnection(id: string, userId: string) {
    const result = await this.pool.query(
      `DELETE FROM bank_connections WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listBankAccounts(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM bank_accounts WHERE user_id = $1 ORDER BY name ASC`,
      [userId],
    );
    return result.rows.map(mapBankAccount);
  }

  async listBankAccountsByConnection(connectionId: string) {
    const result = await this.pool.query(
      `SELECT * FROM bank_accounts WHERE connection_id = $1 ORDER BY name ASC`,
      [connectionId],
    );
    return result.rows.map(mapBankAccount);
  }

  async getBankAccount(id: string, userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM bank_accounts WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapBankAccount(result.rows[0]) : null;
  }

  async replaceBankAccounts(
    connectionId: string,
    accounts: BankAccountRecord[],
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM bank_accounts WHERE connection_id = $1`, [
        connectionId,
      ]);
      for (const account of accounts) {
        await client.query(
          `INSERT INTO bank_accounts
            (id, connection_id, user_id, external_id, name, account_type, balance_cents, currency, last_updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            account.id,
            account.connectionId,
            account.userId,
            account.externalId,
            account.name,
            account.accountType,
            account.balanceCents,
            account.currency,
            account.lastUpdatedAt,
          ],
        );
      }
      await client.query("COMMIT");
      return accounts;
    } catch (error) {
      await client.query("ROLLBACK");
      wrapPgError(error, "Could not save bank account balances.");
    } finally {
      client.release();
    }
  }

  async listExpenses(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(mapExpense);
  }

  async createExpense(expense: ExpenseRecord) {
    await this.pool.query(
      `INSERT INTO expenses
        (id, user_id, merchant, purchase_date, amount_cents, category, receipt_path, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        expense.id,
        expense.userId,
        expense.merchant,
        expense.purchaseDate,
        expense.amountCents,
        expense.category,
        expense.receiptPath,
        expense.createdAt,
      ],
    );
    return expense;
  }

  async deleteExpense(id: string, userId: string) {
    const result = await this.pool.query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listBalanceSnapshots(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM balance_snapshots WHERE user_id = $1 ORDER BY captured_at ASC`,
      [userId],
    );
    return result.rows.map((row) => mapSnapshot(row));
  }

  async addBalanceSnapshot(snapshot: BalanceSnapshotRecord) {
    await this.pool.query(
      `INSERT INTO balance_snapshots
        (id, user_id, captured_at, savings_cents, assets_cents, debts_cents, net_worth_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        snapshot.id,
        snapshot.userId,
        snapshot.capturedAt,
        snapshot.savingsCents,
        snapshot.assetsCents,
        snapshot.debtsCents,
        snapshot.netWorthCents,
      ],
    );
    return snapshot;
  }

  async replaceStreakWeeks(userId: string, weeks: StreakWeekRecord[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM streak_weeks WHERE user_id = $1`, [userId]);
      for (const week of weeks) {
        await client.query(
          `INSERT INTO streak_weeks
            (user_id, week_start, increased, start_cents, end_cents)
           VALUES ($1,$2,$3,$4,$5)`,
          [userId, week.weekStart, week.increased, week.startCents, week.endCents],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      wrapPgError(error, "Could not save streak history.");
    } finally {
      client.release();
    }
  }

  async getSavingsStreak(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM savings_streaks WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] ? mapSavingsStreak(result.rows[0]) : null;
  }

  async saveSavingsStreak(streak: SavingsStreakRecord) {
    await this.pool.query(
      `INSERT INTO savings_streaks (user_id, current_streak, longest_streak, updated_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE
         SET current_streak = EXCLUDED.current_streak,
             longest_streak = EXCLUDED.longest_streak,
             updated_at = EXCLUDED.updated_at`,
      [streak.userId, streak.currentStreak, streak.longestStreak, streak.updatedAt],
    );
    return streak;
  }

  async listStatementTransactions(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM statement_transactions WHERE user_id = $1 ORDER BY purchase_date DESC`,
      [userId],
    );
    return result.rows.map((row) => mapStatement(row));
  }

  async createStatementTransactions(rows: StatementTransactionRecord[]) {
    for (const row of rows) {
      await this.pool.query(
        `INSERT INTO statement_transactions
          (id, user_id, merchant, purchase_date, amount_cents, category, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          row.id,
          row.userId,
          row.merchant,
          row.purchaseDate,
          row.amountCents,
          row.category,
          row.createdAt,
        ],
      );
    }
  }

  async listLessons() {
    const result = await this.pool.query(`SELECT * FROM lessons ORDER BY id`);
    return result.rows.map((row) => mapLesson(row));
  }

  async saveLessons(lessons: LessonRecord[]) {
    for (const lesson of lessons) {
      await this.pool.query(
        `INSERT INTO lessons
          (id, title, body, takeaway, topics, minutes, youtube_url, youtube_label, context_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE
           SET title = EXCLUDED.title,
               body = EXCLUDED.body,
               takeaway = EXCLUDED.takeaway,
               topics = EXCLUDED.topics,
               minutes = EXCLUDED.minutes,
               youtube_url = EXCLUDED.youtube_url,
               youtube_label = EXCLUDED.youtube_label,
               context_key = EXCLUDED.context_key`,
        [
          lesson.id,
          lesson.title,
          lesson.body,
          lesson.takeaway,
          lesson.topics,
          lesson.minutes,
          lesson.youtubeUrl,
          lesson.youtubeLabel,
          lesson.contextKey,
        ],
      );
    }
  }

  async listLessonReads(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM lesson_reads WHERE user_id = $1`,
      [userId],
    );
    return result.rows.map((row) => mapLessonRead(row));
  }

  async markLessonRead(read: LessonReadRecord) {
    await this.pool.query(
      `INSERT INTO lesson_reads (user_id, lesson_id, read_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET read_at = EXCLUDED.read_at`,
      [read.userId, read.lessonId, read.readAt],
    );
  }

  async listLessonSaves(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM lesson_saves WHERE user_id = $1 ORDER BY saved_at DESC`,
      [userId],
    );
    return result.rows.map((row) => mapLessonSave(row));
  }

  async setLessonSaved(save: LessonSaveRecord, saved: boolean) {
    if (!saved) {
      await this.pool.query(
        `DELETE FROM lesson_saves WHERE user_id = $1 AND lesson_id = $2`,
        [save.userId, save.lessonId],
      );
      return;
    }
    await this.pool.query(
      `INSERT INTO lesson_saves (user_id, lesson_id, saved_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET saved_at = EXCLUDED.saved_at`,
      [save.userId, save.lessonId, save.savedAt],
    );
  }

  async listUserBadges(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC`,
      [userId],
    );
    return result.rows.map((row) => mapBadge(row));
  }

  async awardBadge(badge: UserBadgeRecord) {
    const result = await this.pool.query(
      `INSERT INTO user_badges (user_id, badge_id, earned_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, badge_id) DO NOTHING
       RETURNING badge_id`,
      [badge.userId, badge.badgeId, badge.earnedAt],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listWeeklySummaries(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM weekly_summaries WHERE user_id = $1 ORDER BY week_start DESC`,
      [userId],
    );
    return result.rows.map((row) => mapSummary(row));
  }

  async getWeeklySummary(userId: string, weekStart: string) {
    const result = await this.pool.query(
      `SELECT * FROM weekly_summaries WHERE user_id = $1 AND week_start = $2`,
      [userId, weekStart],
    );
    return result.rows[0] ? mapSummary(result.rows[0]) : null;
  }

  async saveWeeklySummary(summary: WeeklySummaryRecord) {
    await this.pool.query(
      `INSERT INTO weekly_summaries
        (id, user_id, week_start, spending_cents, previous_spending_cents,
         top_categories, goal_note, streak_note, tip, body, had_activity, source, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (user_id, week_start) DO UPDATE
         SET spending_cents = EXCLUDED.spending_cents,
             previous_spending_cents = EXCLUDED.previous_spending_cents,
             top_categories = EXCLUDED.top_categories,
             goal_note = EXCLUDED.goal_note,
             streak_note = EXCLUDED.streak_note,
             tip = EXCLUDED.tip,
             body = EXCLUDED.body,
             had_activity = EXCLUDED.had_activity,
             source = EXCLUDED.source`,
      [
        summary.id,
        summary.userId,
        summary.weekStart,
        summary.spendingCents,
        summary.previousSpendingCents,
        JSON.stringify(summary.topCategories),
        summary.goalNote,
        summary.streakNote,
        summary.tip,
        summary.body,
        summary.hadActivity,
        summary.source,
        summary.createdAt,
      ],
    );
    return summary;
  }

  async createPasswordReset(reset: PasswordResetRecord) {
    await this.pool.query(
      `INSERT INTO password_resets
        (id, user_id, token_hash, expires_at, used_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        reset.id,
        reset.userId,
        reset.tokenHash,
        reset.expiresAt,
        reset.usedAt,
        reset.createdAt,
      ],
    );
  }

  async invalidateOpenPasswordResets(userId: string) {
    await this.pool.query(
      `UPDATE password_resets SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  }

  async claimPasswordReset(tokenHash: string, usedAt: string) {
    const claimed = await this.pool.query(
      `UPDATE password_resets
       SET used_at = $2
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING *`,
      [tokenHash, usedAt],
    );
    if (claimed.rows[0]) {
      return { status: "ok" as const, reset: mapPasswordReset(claimed.rows[0]) };
    }
    const existing = await this.pool.query(
      `SELECT * FROM password_resets WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = existing.rows[0];
    if (!row) {
      return { status: "missing" as const };
    }
    if (row.used_at) {
      return { status: "used" as const };
    }
    return { status: "expired" as const };
  }

  async releasePasswordReset(id: string) {
    await this.pool.query(
      `UPDATE password_resets SET used_at = NULL WHERE id = $1`,
      [id],
    );
  }

  async countConsentResends(userId: string, since: string) {
    const result = await this.pool.query(
      `SELECT count(*)::int AS total FROM consent_resends
       WHERE user_id = $1 AND sent_at >= $2`,
      [userId, since],
    );
    return Number(result.rows[0]?.total ?? 0);
  }

  async createConsentResend(record: ConsentResendRecord) {
    await this.pool.query(
      `INSERT INTO consent_resends (id, user_id, consent_id, guardian_email, sent_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [record.id, record.userId, record.consentId, record.guardianEmail, record.sentAt],
    );
  }

  async listGoalChanges(userId: string) {
    const result = await this.pool.query(
      `SELECT * FROM goal_changes WHERE user_id = $1 ORDER BY changed_at DESC`,
      [userId],
    );
    return result.rows.map(mapGoalChange);
  }

  async createGoalChange(change: GoalChangeRecord) {
    await this.pool.query(
      `INSERT INTO goal_changes
        (id, goal_id, user_id, old_target_amount_cents, new_target_amount_cents,
         old_target_date, new_target_date, changed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        change.id,
        change.goalId,
        change.userId,
        change.oldTargetAmountCents,
        change.newTargetAmountCents,
        change.oldTargetDate,
        change.newTargetDate,
        change.changedAt,
      ],
    );
  }
}

function mapPasswordReset(row: Record<string, unknown>): PasswordResetRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    expiresAt: asIso(row.expires_at as Date | string) ?? new Date().toISOString(),
    usedAt: asIso((row.used_at as Date | string | null) ?? null),
    createdAt: asIso(row.created_at as Date | string) ?? new Date().toISOString(),
  };
}

function mapGoalChange(row: Record<string, unknown>): GoalChangeRecord {
  return {
    id: String(row.id),
    goalId: String(row.goal_id),
    userId: String(row.user_id),
    oldTargetAmountCents: Number(row.old_target_amount_cents),
    newTargetAmountCents: Number(row.new_target_amount_cents),
    oldTargetDate: asDate(row.old_target_date as Date | string),
    newTargetDate: asDate(row.new_target_date as Date | string),
    changedAt: asIso(row.changed_at as Date | string) ?? new Date().toISOString(),
  };
}

function mapUser(row: Record<string, unknown>): UserRecord {
  const schoolKind = row.school_kind;
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: String(row.first_name),
    lastName: String(row.last_name ?? ""),
    dateOfBirth: asDate(row.date_of_birth as Date | string),
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
    createdAt: asIso(row.created_at as Date | string) ?? new Date().toISOString(),
  };
}

function mapConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    guardianEmail: String(row.guardian_email),
    token: String(row.token),
    decision: row.decision as ConsentRecord["decision"],
    decidedAt: asIso((row.decided_at as Date | string | null) ?? null),
    createdAt: asIso(row.created_at as Date | string) ?? new Date().toISOString(),
    sentAt:
      asIso((row.sent_at as Date | string | null) ?? null) ??
      asIso(row.created_at as Date | string) ??
      new Date().toISOString(),
    expiresAt:
      asIso((row.expires_at as Date | string | null) ?? null) ??
      new Date(
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
    targetDate: asDate(row.target_date as Date | string),
    linkedAccountId: row.linked_account_id
      ? String(row.linked_account_id)
      : null,
    savedPlan:
      row.saved_plan && typeof row.saved_plan === "object"
        ? (row.saved_plan as Record<string, unknown>)
        : null,
    savedPlanAt: asIso((row.saved_plan_at as Date | string | null) ?? null),
    planStale: Boolean(row.plan_stale),
    createdAt: asIso(row.created_at as Date | string) ?? new Date().toISOString(),
    updatedAt: asIso(row.updated_at as Date | string) ?? new Date().toISOString(),
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
    connectedAt:
      asIso(row.connected_at as Date | string) ?? new Date().toISOString(),
    lastRefreshedAt:
      asIso(row.last_refreshed_at as Date | string) ?? new Date().toISOString(),
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
    lastUpdatedAt:
      asIso(row.last_updated_at as Date | string) ?? new Date().toISOString(),
  };
}

function mapExpense(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    merchant: String(row.merchant),
    purchaseDate: asDate(row.purchase_date as Date | string),
    amountCents: Number(row.amount_cents),
    category: row.category as ExpenseCategory,
    receiptPath: String(row.receipt_path),
    createdAt: asIso(row.created_at as Date | string) ?? new Date().toISOString(),
  };
}
