export type BankAccountType =
  | "checking"
  | "savings"
  | "investment"
  | "credit"
  | "loan";

export interface BankDirectoryOption {
  id: string;
  name: string;
  city: string;
  state: string;
  logoUrl: string;
  domain?: string;
}

export interface BankConnectionRecord {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  bankCity: string;
  bankState: string;
  domain: string | null;
  itemId: string | null;
  accessToken: string | null;
  institutionId: string | null;
  connectedAt: string;
  lastRefreshedAt: string;
}

export interface BankAccountRecord {
  id: string;
  connectionId: string;
  userId: string;
  externalId: string;
  name: string;
  accountType: BankAccountType;
  balanceCents: number;
  currency: string;
  lastUpdatedAt: string;
}

export interface PublicBankAccount {
  id: string;
  connectionId: string;
  name: string;
  accountType: BankAccountType;
  balance: number;
  lastUpdatedAt: string;
}

export interface PublicBankConnection {
  id: string;
  bankId: string;
  bankName: string;
  bankCity: string;
  bankState: string;
  domain: string | null;
  logoUrl: string;
  itemId: string | null;
  institutionId: string | null;
  connectedAt: string;
  lastRefreshedAt: string;
  accounts: PublicBankAccount[];
}

export interface PublicNetWorth {
  assets: number;
  debts: number;
  netWorth: number;
  lastRefreshedAt: string | null;
}
