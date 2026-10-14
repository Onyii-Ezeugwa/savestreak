export type AgeGroup = "adult" | "minor";
export type AccountStatus = "pending_consent" | "active" | "restricted";

export interface AccountUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ageGroup: AgeGroup;
  status: AccountStatus;
  schoolName: string;
}

export interface AccountGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  targetDate: string;
  progress: number;
  completed: boolean;
  pace: "complete" | "on_track" | "behind";
  linkedAccountId: string | null;
  savedPlan: Record<string, unknown> | null;
  savedPlanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: AccountUser | null;
  needsEmailConfirmation?: boolean;
  consentEmailSent?: boolean;
}

export interface ApiErrorPayload {
  error: string;
  fieldErrors?: Record<string, string>;
}

export function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}/api${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw {
      error: "Cannot reach the $aveStreak API. Try again in a moment.",
    } satisfies ApiErrorPayload;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!response.ok) {
    throw {
      error: payload.error || "Something went wrong. Try again.",
      fieldErrors: payload.fieldErrors,
    } satisfies ApiErrorPayload;
  }
  return payload;
}
