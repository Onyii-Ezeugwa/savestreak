export type ExpenseCategory =
  | "food"
  | "transport"
  | "school"
  | "entertainment"
  | "shopping"
  | "other";

export interface ExpenseRecord {
  id: string;
  userId: string;
  merchant: string;
  purchaseDate: string;
  amountCents: number;
  category: ExpenseCategory;
  receiptPath: string;
  createdAt: string;
}

export interface PublicExpense {
  id: string;
  merchant: string;
  purchaseDate: string;
  amount: number;
  category: ExpenseCategory;
  receiptUrl: string | null;
  createdAt: string;
}

export interface ReceiptScanResult {
  merchant: string;
  purchaseDate: string;
  amount: number;
  category: ExpenseCategory;
}
