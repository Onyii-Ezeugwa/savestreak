import type { ConsentRecord, GoalRecord, UserRecord } from "./types";

export interface DataStore {
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  getAuthUserIdByEmail?(email: string): Promise<string | null>;
  createUser(user: UserRecord): Promise<UserRecord>;
  updateUser(user: UserRecord): Promise<UserRecord>;
  createConsent(consent: ConsentRecord): Promise<ConsentRecord>;
  getConsentByToken(token: string): Promise<ConsentRecord | null>;
  getConsentByUserId(userId: string): Promise<ConsentRecord | null>;
  updateConsent(consent: ConsentRecord): Promise<ConsentRecord>;
  listGoals(userId: string): Promise<GoalRecord[]>;
  getGoal(id: string, userId: string): Promise<GoalRecord | null>;
  createGoal(goal: GoalRecord): Promise<GoalRecord>;
  updateGoal(goal: GoalRecord): Promise<GoalRecord>;
  deleteGoal(id: string, userId: string): Promise<boolean>;
}
