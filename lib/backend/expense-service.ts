import { randomUUID } from "node:crypto";
import { requireActiveAccount } from "./goals-service";
import { scanReceiptImage } from "./receipt-ocr";
import type { DataStore } from "./store";
import type { ExpenseRecord, PublicExpense } from "./expense-types";
import { ApiError, type UserRecord } from "./types";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export class ExpenseService {
  constructor(private readonly store: DataStore) {}

  async list(user: UserRecord): Promise<PublicExpense[]> {
    requireActiveAccount(user);
    const expenses = await this.store.listExpenses(user.id);
    return Promise.all(
      expenses.map(async (expense) => ({
        id: expense.id,
        merchant: expense.merchant,
        purchaseDate: expense.purchaseDate,
        amount: expense.amountCents / 100,
        category: expense.category,
        receiptUrl: this.store.getReceiptSignedUrl
          ? await this.store.getReceiptSignedUrl(expense.receiptPath)
          : null,
        createdAt: expense.createdAt,
      })),
    );
  }

  async captureFromReceipt(
    user: UserRecord,
    input: {
      bytes: Buffer;
      mimeType: string;
      fileName?: string;
      ocrText?: string;
      uploadedOn?: string;
    },
  ) {
    requireActiveAccount(user);

    const mimeType = input.mimeType || "image/jpeg";
    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new ApiError(
        400,
        "Upload a JPG, PNG, or WEBP photo of the receipt.",
      );
    }
    if (input.bytes.length > 8_000_000) {
      throw new ApiError(400, "Keep the receipt photo under 8 MB.");
    }

    const scanned = await scanReceiptImage({
      bytes: input.bytes,
      mimeType,
      ocrText: input.ocrText,
    });
    const amount = Math.abs(Number(scanned.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(
        422,
        "We could not read that receipt. Retake the photo in good light and make sure the total is visible.",
      );
    }

    const id = randomUUID();
    let receiptPath = `local/${user.id}/${id}`;
    if (this.store.uploadReceipt) {
      receiptPath = await this.store.uploadReceipt(
        user.id,
        id,
        input.bytes,
        input.mimeType,
      );
    }

    const uploadedOn =
      typeof input.uploadedOn === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.uploadedOn)
        ? input.uploadedOn
        : new Date().toISOString().slice(0, 10);

    const expense: ExpenseRecord = {
      id,
      userId: user.id,
      merchant: scanned.merchant,
      purchaseDate: uploadedOn,
      amountCents: Math.round(amount * 100),
      category: scanned.category,
      receiptPath,
      createdAt: new Date().toISOString(),
    };
    await this.store.createExpense(expense);

    return {
      expense: {
        id: expense.id,
        merchant: expense.merchant,
        purchaseDate: expense.purchaseDate,
        amount: expense.amountCents / 100,
        category: expense.category,
        receiptUrl: this.store.getReceiptSignedUrl
          ? await this.store.getReceiptSignedUrl(expense.receiptPath)
          : null,
        createdAt: expense.createdAt,
      } satisfies PublicExpense,
      scan: scanned,
    };
  }
}
