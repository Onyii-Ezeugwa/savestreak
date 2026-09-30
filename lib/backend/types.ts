export type AgeGroup = "adult" | "minor";
export type AccountStatus = "pending_consent" | "active" | "restricted";
export type ConsentDecision = "pending" | "approved" | "declined";

export type SchoolKind = "k12" | "college" | "";

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ageGroup: AgeGroup;
  status: AccountStatus;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  schoolId: string;
  schoolName: string;
  schoolCity: string;
  schoolState: string;
  schoolKind: SchoolKind;
  createdAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  guardianEmail: string;
  token: string;
  decision: ConsentDecision;
  decidedAt: string | null;
  createdAt: string;
}

export interface GoalRecord {
  id: string;
  userId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ageGroup: AgeGroup;
  status: AccountStatus;
  schoolName: string;
}

export interface PublicGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicConsent {
  studentFirstName: string;
  guardianEmail: string;
  decision: ConsentDecision;
  decidedAt: string | null;
}

export class ApiError extends Error {
  statusCode: number;
  fieldErrors?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.fieldErrors = fieldErrors;
  }
}

export function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
