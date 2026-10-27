import type { ConsentRecord, GoalRecord, UserRecord } from "./types";
import type {
  BankAccountRecord,
  BankConnectionRecord,
} from "./bank-types";
import type { ExpenseRecord } from "./expense-types";
import type {
  BalanceSnapshotRecord,
  LessonReadRecord,
  LessonRecord,
  LessonSaveRecord,
  SavingsStreakRecord,
  StatementTransactionRecord,
  StreakWeekRecord,
  UserBadgeRecord,
  WeeklySummaryRecord,
} from "./habit-types";

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
  listBankConnections(userId: string): Promise<BankConnectionRecord[]>;
  getBankConnection(
    id: string,
    userId: string,
  ): Promise<BankConnectionRecord | null>;
  createBankConnection(
    connection: BankConnectionRecord,
  ): Promise<BankConnectionRecord>;
  updateBankConnection(
    connection: BankConnectionRecord,
  ): Promise<BankConnectionRecord>;
  deleteBankConnection(id: string, userId: string): Promise<boolean>;
  listBankAccounts(userId: string): Promise<BankAccountRecord[]>;
  listBankAccountsByConnection(
    connectionId: string,
  ): Promise<BankAccountRecord[]>;
  getBankAccount(
    id: string,
    userId: string,
  ): Promise<BankAccountRecord | null>;
  replaceBankAccounts(
    connectionId: string,
    accounts: BankAccountRecord[],
  ): Promise<BankAccountRecord[]>;
  listExpenses(userId: string): Promise<ExpenseRecord[]>;
  createExpense(expense: ExpenseRecord): Promise<ExpenseRecord>;
  deleteExpense(id: string, userId: string): Promise<boolean>;
  uploadReceipt?(
    userId: string,
    expenseId: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<string>;
  getReceiptSignedUrl?(path: string): Promise<string | null>;
  listBalanceSnapshots(userId: string): Promise<BalanceSnapshotRecord[]>;
  addBalanceSnapshot(
    snapshot: BalanceSnapshotRecord,
  ): Promise<BalanceSnapshotRecord>;
  replaceStreakWeeks(userId: string, weeks: StreakWeekRecord[]): Promise<void>;
  getSavingsStreak(userId: string): Promise<SavingsStreakRecord | null>;
  saveSavingsStreak(streak: SavingsStreakRecord): Promise<SavingsStreakRecord>;
  listStatementTransactions(
    userId: string,
  ): Promise<StatementTransactionRecord[]>;
  createStatementTransactions(
    rows: StatementTransactionRecord[],
  ): Promise<void>;
  listLessons(): Promise<LessonRecord[]>;
  saveLessons(lessons: LessonRecord[]): Promise<void>;
  listLessonReads(userId: string): Promise<LessonReadRecord[]>;
  markLessonRead(read: LessonReadRecord): Promise<void>;
  listLessonSaves(userId: string): Promise<LessonSaveRecord[]>;
  setLessonSaved(save: LessonSaveRecord, saved: boolean): Promise<void>;
  listUserBadges(userId: string): Promise<UserBadgeRecord[]>;
  awardBadge(badge: UserBadgeRecord): Promise<boolean>;
  listWeeklySummaries(userId: string): Promise<WeeklySummaryRecord[]>;
  getWeeklySummary(
    userId: string,
    weekStart: string,
  ): Promise<WeeklySummaryRecord | null>;
  saveWeeklySummary(
    summary: WeeklySummaryRecord,
  ): Promise<WeeklySummaryRecord>;
}
