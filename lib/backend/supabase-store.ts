import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { DataStore } from "./store";
import type {
  BankAccountRecord,
  BankAccountType,
  BankConnectionRecord,
} from "./bank-types";
import type { ExpenseCategory, ExpenseRecord } from "./expense-types";
import type {
  ConsentRecord,
  GoalRecord,
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
        decision: consent.decision,
        decided_at: consent.decidedAt,
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
}
