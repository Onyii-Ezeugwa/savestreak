import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { DataStore } from "./store";
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
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function fail(error: { message?: string } | null, fallback: string) {
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
}
