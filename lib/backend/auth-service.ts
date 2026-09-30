import { randomBytes, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataStore } from "./store";
import { passwordError } from "@/lib/password";
import { parseProfileInput } from "@/lib/profile";
import { sendConsentEmail } from "./mail";
import {
  ApiError,
  appUrl,
  type ConsentRecord,
  type PublicUser,
  type UserRecord,
} from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    ageGroup: user.ageGroup,
    status: user.status,
    schoolName: user.schoolName,
  };
}

export function parseDateOnly(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function ageFromDob(dob: Date, today = new Date()) {
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAdult(dob: Date) {
  return ageFromDob(dob) >= 18;
}

export class AuthService {
  constructor(private readonly store: DataStore) {}

  async register(
    supabase: SupabaseClient,
    input: {
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
      dateOfBirth?: unknown;
      guardianEmail?: unknown;
      phone?: unknown;
      streetAddress?: unknown;
      city?: unknown;
      state?: unknown;
      postalCode?: unknown;
      schoolId?: unknown;
      schoolName?: unknown;
      schoolCity?: unknown;
      schoolState?: unknown;
      schoolKind?: unknown;
    },
    origin?: string,
  ) {
    const fieldErrors: Record<string, string> = {};
    const firstName =
      typeof input.firstName === "string" ? input.firstName.trim() : "";
    const { profile, fieldErrors: profileErrors } = parseProfileInput(input);
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const dateOfBirth =
      typeof input.dateOfBirth === "string" ? input.dateOfBirth : "";
    const guardianEmail =
      typeof input.guardianEmail === "string"
        ? input.guardianEmail.trim().toLowerCase()
        : "";

    if (!firstName) {
      fieldErrors.firstName = "Enter your first name.";
    }
    Object.assign(fieldErrors, profileErrors);
    if (!EMAIL_PATTERN.test(email)) {
      fieldErrors.email = "Enter a valid email address.";
    }
    const passwordIssue = passwordError(password);
    if (passwordIssue) {
      fieldErrors.password = passwordIssue;
    }
    const confirmPassword =
      typeof input.confirmPassword === "string" ? input.confirmPassword : "";
    if (confirmPassword !== password) {
      fieldErrors.confirmPassword = "Passwords do not match.";
    }
    const dob = parseDateOnly(dateOfBirth);
    if (!dob) {
      fieldErrors.dateOfBirth = "Enter a valid date of birth.";
    } else if (dob > new Date()) {
      fieldErrors.dateOfBirth = "Date of birth cannot be in the future.";
    } else if (ageFromDob(dob) < 13) {
      fieldErrors.dateOfBirth = "You must be at least 13 to create an account.";
    }

    const adult = dob ? isAdult(dob) : true;
    if (!adult) {
      if (!EMAIL_PATTERN.test(guardianEmail)) {
        fieldErrors.guardianEmail =
          "Enter a valid parent or guardian email address.";
      } else if (guardianEmail === email) {
        fieldErrors.guardianEmail =
          "Use a parent or guardian email, not your own.";
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(400, "Check the highlighted fields.", fieldErrors);
    }

    const existing = await this.store.getUserByEmail(email);
    if (existing) {
      throw new ApiError(409, "An account with that email already exists.", {
        email: "An account with that email already exists.",
      });
    }

    const priorAuthUserId =
      (await this.store.getAuthUserIdByEmail?.(email)) ?? null;
    if (priorAuthUserId) {
      const matched = await this.resolveAuthUserId(
        supabase,
        email,
        password,
        null,
      );
      if (!matched) {
        throw new ApiError(
          401,
          "Those credentials do not match an account. Check your email and password.",
        );
      }
      return this.finishProfile(matched, {
        email,
        firstName,
        ...profile,
        dateOfBirth,
        adult,
        guardianEmail,
        session: null,
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${(origin || appUrl()).replace(/\/$/, "")}/auth/callback`,
        data: {
          first_name: firstName,
          last_name: profile.lastName,
          date_of_birth: dateOfBirth,
          age_group: adult ? "adult" : "minor",
        },
      },
    });

    const rateLimited =
      error?.code === "over_email_send_rate_limit" ||
      error?.message.toLowerCase().includes("rate limit");

    if (error && !rateLimited) {
      const duplicate =
        error.message.toLowerCase().includes("already") ||
        error.status === 422;
      if (!duplicate) {
        throw new ApiError(400, error.message);
      }
    }

    const authUserId = await this.resolveAuthUserId(
      supabase,
      email,
      password,
      data?.user ?? null,
    );
    if (!authUserId) {
      if (rateLimited) {
        throw new ApiError(
          429,
          "Confirmation emails are paused for a little while. Open the $aveStreak email you already received, then log in.",
        );
      }
      throw new ApiError(409, "An account with that email already exists.", {
        email: "An account with that email already exists.",
      });
    }

    return this.finishProfile(authUserId, {
      email,
      firstName,
      ...profile,
      dateOfBirth,
      adult,
      guardianEmail,
      session: data?.session ?? null,
    });
  }

  private async finishProfile(
    authUserId: string,
    input: {
      email: string;
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      adult: boolean;
      guardianEmail: string;
      phone: string;
      streetAddress: string;
      city: string;
      state: string;
      postalCode: string;
      schoolId: string;
      schoolName: string;
      schoolCity: string;
      schoolState: string;
      schoolKind: "" | "k12" | "college";
      session: { access_token: string } | null;
    },
  ) {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: authUserId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      ageGroup: input.adult ? "adult" : "minor",
      status: input.adult ? "active" : "pending_consent",
      phone: input.phone,
      streetAddress: input.streetAddress,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      schoolCity: input.schoolCity,
      schoolState: input.schoolState,
      schoolKind: input.schoolKind,
      createdAt: now,
    };
    await this.store.createUser(user);

    let consentUrl: string | undefined;
    let consentEmailSent: boolean | undefined;
    if (!input.adult) {
      const existingConsent = await this.store.getConsentByUserId(user.id);
      if (!existingConsent) {
        const consent: ConsentRecord = {
          id: randomUUID(),
          userId: user.id,
          guardianEmail: input.guardianEmail,
          token: randomBytes(24).toString("hex"),
          decision: "pending",
          decidedAt: null,
          createdAt: now,
        };
        await this.store.createConsent(consent);
        consentUrl = `${appUrl()}/consent/${consent.token}`;
        consentEmailSent = await sendConsentEmail({
          consentId: consent.id,
          guardianEmail: input.guardianEmail,
          studentFirstName: input.firstName,
          consentUrl,
        });
      } else if (existingConsent.decision === "pending") {
        consentUrl = `${appUrl()}/consent/${existingConsent.token}`;
        consentEmailSent = await sendConsentEmail({
          consentId: existingConsent.id,
          guardianEmail: existingConsent.guardianEmail,
          studentFirstName: input.firstName,
          consentUrl,
        });
      }
    }

    return {
      needsEmailConfirmation: !input.session,
      user: input.session ? toPublicUser(user) : null,
      consentEmailSent,
    };
  }

  private async resolveAuthUserId(
    supabase: SupabaseClient,
    email: string,
    password: string,
    signUpUser: { id: string; identities?: { id: string }[] } | null,
  ) {
    if (signUpUser?.id && (signUpUser.identities?.length ?? 0) > 0) {
      return signUpUser.id;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (data.user?.id) {
      await supabase.auth.signOut();
      return data.user.id;
    }

    const unconfirmed =
      error?.code === "email_not_confirmed" ||
      error?.message.toLowerCase().includes("email not confirmed");
    if (!unconfirmed) {
      return null;
    }

    return (await this.store.getAuthUserIdByEmail?.(email)) ?? null;
  }

  async login(
    supabase: SupabaseClient,
    input: { email?: unknown; password?: unknown },
  ) {
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (!email || !password) {
      throw new ApiError(400, "Enter your email and password.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const unconfirmed =
        error?.message.toLowerCase().includes("email not confirmed") ||
        error?.code === "email_not_confirmed";
      if (unconfirmed) {
        throw new ApiError(
          403,
          "Confirm your email before logging in. Check your inbox for the $aveStreak link.",
        );
      }
      throw new ApiError(
        401,
        "Those credentials do not match an account. Check your email and password.",
      );
    }

    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new ApiError(
        403,
        "Confirm your email before logging in. Check your inbox for the $aveStreak link.",
      );
    }

    const record = await this.store.getUserById(data.user.id);
    if (!record) {
      throw new ApiError(
        401,
        "This account is missing a $aveStreak profile. Sign up again.",
      );
    }

    return {
      user: toPublicUser(record),
    };
  }

  async me(userId: string) {
    const user = await this.store.getUserById(userId);
    if (!user) {
      throw new ApiError(401, "Your session is no longer valid.");
    }
    return toPublicUser(user);
  }
}
