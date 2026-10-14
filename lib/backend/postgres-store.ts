import pg from "pg";
import type { DataStore } from "./store";
import type {
  BankAccountRecord,
  BankAccountType,
  BankConnectionRecord,
} from "./bank-types";
import type { ExpenseCategory, ExpenseRecord } from "./expense-types";
import {
  ApiError,
  type ConsentRecord,
  type GoalRecord,
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
        (id, user_id, guardian_email, token, decision, decided_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        consent.id,
        consent.userId,
        consent.guardianEmail,
        consent.token,
        consent.decision,
        consent.decidedAt,
        consent.createdAt,
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
      `UPDATE consents SET decision = $2, decided_at = $3 WHERE id = $1`,
      [consent.id, consent.decision, consent.decidedAt],
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
        (id, user_id, name, target_amount_cents, current_amount_cents, target_date, linked_account_id, saved_plan, saved_plan_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
        saved_plan_at = $8, updated_at = $9
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
