import type { ExpenseCategory } from "@/lib/backend/expense-types";

export interface ParsedReceiptFields {
  merchant: string;
  purchaseDate: string;
  amount: number;
  category: ExpenseCategory;
}

function categorizeMerchant(merchant: string): ExpenseCategory {
  const value = merchant.toLowerCase();
  if (
    /(cafe|coffee|pizza|burger|food|grocery|market|chipotle|starbucks|dining|restaurant)/.test(
      value,
    )
  ) {
    return "food";
  }
  if (
    /(uber|lyft|transit|metro|gas|shell|parking|bus|postal|usps|post office)/.test(
      value,
    )
  ) {
    return "transport";
  }
  if (/(bookstore|tuition|campus|university|college|staples)/.test(value)) {
    return "school";
  }
  if (/(cinema|movie|game|spotify|netflix|concert)/.test(value)) {
    return "entertainment";
  }
  if (/(target|walmart|amazon|store|mall|clothing)/.test(value)) {
    return "shopping";
  }
  return "other";
}

function normalizeDate(raw: string): string | null {
  const iso = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Prefer a clean US date; ignore OCR junk like "109/28/2026".
  const usMatches = [
    ...raw.matchAll(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/g),
  ];
  for (const us of usMatches) {
    let y = us[3];
    if (y.length === 2) {
      y = `20${y}`;
    }
    const m = Number(us[1]);
    const d = Number(us[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return null;
}

/** Pull a money value from a line, including refunds like -$29.65. */
function parseAmountFromLine(line: string): number | null {
  const normalized = line
    .replace(/[Oo]/g, "0")
    .replace(/[Ss](?=\d)/g, "$")
    .replace(/[–—−]/g, "-");

  const matches = [
    ...normalized.matchAll(
      /-?\s*\$?\s*(-?\d{1,5}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2})/g,
    ),
  ];
  if (matches.length === 0) {
    return null;
  }

  // Prefer the last money token on the line (totals are usually right-aligned).
  const raw = matches[matches.length - 1]?.[1];
  if (!raw) {
    return null;
  }
  const value = Math.abs(Number(raw.replace(/,/g, "")));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function scoreTotalLine(line: string) {
  if (/g?rand\s*total|grand\s*totai|frand\s*total/i.test(line)) {
    return 100;
  }
  if (/\btotal\b/i.test(line) && !/sub\s*total/i.test(line)) {
    return 80;
  }
  if (/amount\s*due|balance\s*due|\bcash\b|paid/i.test(line)) {
    return 60;
  }
  if (/sub\s*total/i.test(line)) {
    return 20;
  }
  return 0;
}

function pickAmount(lines: string[]): number | null {
  let bestScore = 0;
  let bestAmount: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const score = scoreTotalLine(line);
    if (score === 0) {
      continue;
    }
    const amount =
      parseAmountFromLine(line) ??
      (index + 1 < lines.length
        ? parseAmountFromLine(lines[index + 1]!)
        : null);
    if (amount === null) {
      continue;
    }
    if (score >= bestScore) {
      bestScore = score;
      bestAmount = amount;
    }
  }

  if (bestAmount !== null) {
    return bestAmount;
  }

  const amounts: number[] = [];
  for (const line of lines) {
    const amount = parseAmountFromLine(line);
    if (amount !== null && amount < 10_000) {
      amounts.push(amount);
    }
  }
  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function pickDate(text: string): string {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const parsed = normalizeDate(line);
    if (parsed) {
      return parsed;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function pickMerchant(lines: string[]): string {
  const joined = lines.join(" ");
  if (/united\s+states\s+postal|u\.?s\.?\s*postal|\busps\b/i.test(joined)) {
    return "USPS";
  }

  const skip =
    /^(receipt|invoice|tel|phone|www\.|http|#|product|qty|unit|price|refund|customer|copy|\d{3}[-.\s]?\d{3})/i;

  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 60) {
      continue;
    }
    if (skip.test(trimmed)) {
      continue;
    }
    if (/^\d+$/.test(trimmed)) {
      continue;
    }
    if (/^\d+[.\-/]/.test(trimmed) && /\d{2,}/.test(trimmed)) {
      continue;
    }
    return trimmed.slice(0, 80);
  }
  return "Receipt purchase";
}

export function parseReceiptText(text: string): ParsedReceiptFields | null {
  const cleaned = text.replace(/\u0000/g, "").trim();
  if (cleaned.length < 8) {
    return null;
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Also try splitting on multiple spaces when OCR returns one long block.
  const expanded =
    lines.length <= 2
      ? cleaned
          .split(/\r?\n|(?<=\d{2})\s{2,}|(?<=[A-Za-z])\s{2,}(?=[A-Za-z0-9])/)
          .map((line) => line.trim())
          .filter(Boolean)
      : lines;

  const amount = pickAmount(expanded.length > 0 ? expanded : lines);
  if (amount === null) {
    return null;
  }

  const merchant = pickMerchant(expanded.length > 0 ? expanded : lines);
  const purchaseDate = pickDate(cleaned);

  return {
    merchant,
    purchaseDate,
    amount: Math.round(amount * 100) / 100,
    category: categorizeMerchant(merchant),
  };
}
