import { getModelQueue } from "@/lib/openrouter";
import { categorizeMerchant } from "@/lib/receipt-text-parse";
import type { ParsedStatementRow } from "./habits";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_ROWS = 200;
const MAX_MODEL_CHARS = 16_000;

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const SKIP_LINE =
  /\b(beginning balance|ending balance|new balance|statement balance|available balance|balance forward|previous balance|deposit|payroll|direct dep|dir dep|ach credit|interest earned|payment thank|thank you|online payment|autopay|card payment|credit card payment|total fees|total deposits|total credits|page \d+|account number|routing number)\b/i;

const DATE_RE =
  /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)\b/i;

const MONEY_RE = /(?<![A-Za-z\d])\(?-?\$?(?:\d{1,3}(?:,\d{3})+|\d{1,7})\.\d{2}\)?/g;

function statementYear(text: string) {
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  if (years.length === 0) {
    return new Date().getFullYear();
  }
  const counts = new Map<number, number>();
  for (const year of years) {
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function isoDay(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseLooseDate(raw: string, fallbackYear: number) {
  const value = raw.trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return isoDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
    return isoDay(year, Number(us[1]), Number(us[2]));
  }
  const short = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (short) {
    return isoDay(fallbackYear, Number(short[1]), Number(short[2]));
  }
  const named = value.match(
    /^((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i,
  );
  if (!named) {
    return null;
  }
  const month = MONTHS[named[1].slice(0, 4).toLowerCase()] ?? MONTHS[named[1].slice(0, 3).toLowerCase()];
  if (!month) {
    return null;
  }
  return isoDay(named[3] ? Number(named[3]) : fallbackYear, month, Number(named[2]));
}

function moneyValues(line: string) {
  const values: number[] = [];
  for (const match of line.matchAll(MONEY_RE)) {
    const cleaned = match[0].replace(/[$,]/g, "");
    const negative = cleaned.startsWith("(") || cleaned.startsWith("-");
    const amount = Math.abs(Number(cleaned.replace(/[()]/g, "")));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50_000) {
      continue;
    }
    values.push(negative ? -amount : amount);
  }
  return values;
}

function cleanMerchant(value: string) {
  return value
    .replace(/\b\d{5,}\b/g, " ")
    .replace(/[^a-zA-Z0-9&.'# /-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function rowFromParts(
  purchaseDate: string,
  merchant: string,
  amount: number,
): ParsedStatementRow | null {
  const name = cleanMerchant(merchant);
  if (name.length < 3 || !/[a-z]/i.test(name)) {
    return null;
  }
  const amountCents = Math.round(Math.abs(amount) * 100);
  if (amountCents <= 0) {
    return null;
  }
  return {
    purchaseDate,
    merchant: name,
    amountCents,
    category: categorizeMerchant(name),
  };
}

/** Pull purchase lines when each transaction sits on its own line. */
export function parseStatementLines(text: string): ParsedStatementRow[] {
  const year = statementYear(text);
  const rows: ParsedStatementRow[] = [];
  const seen = new Set<string>();

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /%/.test(trimmed) || SKIP_LINE.test(trimmed)) {
      continue;
    }
    const dateMatch = trimmed.match(DATE_RE);
    if (!dateMatch) {
      continue;
    }
    const purchaseDate = parseLooseDate(dateMatch[1], year);
    const amounts = moneyValues(trimmed);
    if (!purchaseDate || amounts.length === 0) {
      continue;
    }
    const merchant = trimmed
      .replace(dateMatch[0], " ")
      .replace(MONEY_RE, " ");
    const row = rowFromParts(purchaseDate, merchant, amounts[0]!);
    if (!row) {
      continue;
    }
    const key = `${row.purchaseDate}|${row.merchant.toLowerCase()}|${row.amountCents}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push(row);
    if (rows.length >= MAX_ROWS) {
      break;
    }
  }

  return rows;
}

function amountAppears(text: string, amount: number) {
  const cents = Math.abs(amount).toFixed(2);
  const comma = Number(cents).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return text.includes(cents) || text.includes(comma);
}

function merchantAppears(text: string, merchant: string) {
  const hay = text.toLowerCase();
  const token = merchant
    .toLowerCase()
    .split(/\s+/)
    .find((part) => part.length >= 3);
  return Boolean(token && hay.includes(token));
}

async function parseStatementWithModel(text: string): Promise<ParsedStatementRow[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const sample = text.slice(0, MAX_MODEL_CHARS);
  const year = statementYear(sample);

  for (const model of getModelQueue()) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://savestreak.org",
          "X-Title": "$aveStreak",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You extract purchases from a bank or card statement. Return ONLY JSON. Copy merchants and amounts from the text. Do not invent rows. Do not give financial advice.",
            },
            {
              role: "user",
              content: `Statement text:
${sample}

Return JSON:
{"transactions":[{"date":"YYYY-MM-DD","merchant":"store name","amount":12.34}]}

Rules:
- Include purchases, card charges, withdrawals, and fees.
- Skip deposits, payroll, transfers in, payments toward the card, interest, and running balances.
- Use a positive amount.
- If a row has no year, use ${year}.
- Maximum ${MAX_ROWS} rows.`,
            },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) {
        continue;
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      const raw = typeof content === "string" ? content : "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) {
        continue;
      }
      const parsed = JSON.parse(raw.slice(start, end + 1)) as {
        transactions?: Array<{ date?: unknown; merchant?: unknown; amount?: unknown }>;
      };
      if (!Array.isArray(parsed.transactions)) {
        continue;
      }
      const rows: ParsedStatementRow[] = [];
      const seen = new Set<string>();
      for (const item of parsed.transactions) {
        if (typeof item.date !== "string" || typeof item.merchant !== "string") {
          continue;
        }
        const amount = Number(item.amount);
        const purchaseDate = parseLooseDate(item.date, year);
        if (!purchaseDate || !Number.isFinite(amount) || !amountAppears(sample, amount)) {
          continue;
        }
        const merchant = item.merchant.replaceAll("—", " ").replaceAll("–", " ");
        if (!merchantAppears(sample, merchant)) {
          continue;
        }
        const row = rowFromParts(purchaseDate, merchant, amount);
        if (!row) {
          continue;
        }
        const key = `${row.purchaseDate}|${row.merchant.toLowerCase()}|${row.amountCents}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        rows.push(row);
        if (rows.length >= MAX_ROWS) {
          break;
        }
      }
      if (rows.length > 0) {
        return rows;
      }
    } catch {
      // try the next model
    }
  }

  return null;
}

export async function parseStatementDocument(text: string): Promise<ParsedStatementRow[]> {
  const fromLines = parseStatementLines(text);
  if (fromLines.length > 0) {
    return fromLines;
  }
  return (await parseStatementWithModel(text)) ?? [];
}
