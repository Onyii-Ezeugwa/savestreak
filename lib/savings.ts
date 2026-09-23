export const SAVINGS_FREQUENCIES = [
  "day",
  "week",
  "two-weeks",
  "month",
  "year",
] as const;

export type SavingsFrequency = (typeof SAVINGS_FREQUENCIES)[number];

export const SAVINGS_FREQUENCY_OPTIONS: Array<{
  value: SavingsFrequency;
  label: string;
}> = [
  { value: "day", label: "each day" },
  { value: "week", label: "each week" },
  { value: "two-weeks", label: "every 2 weeks" },
  { value: "month", label: "each month" },
  { value: "year", label: "each year" },
];

export function isSavingsFrequency(value: unknown): value is SavingsFrequency {
  return (
    typeof value === "string" &&
    SAVINGS_FREQUENCIES.includes(value as SavingsFrequency)
  );
}

export function frequencyLabel(frequency: SavingsFrequency): string {
  return (
    SAVINGS_FREQUENCY_OPTIONS.find((option) => option.value === frequency)
      ?.label ?? "each week"
  );
}

export function toWeeklyAmount(
  amount: number,
  frequency: SavingsFrequency,
): number {
  switch (frequency) {
    case "day":
      return amount * 7;
    case "week":
      return amount;
    case "two-weeks":
      return amount / 2;
    case "month":
      return (amount * 12) / 52;
    case "year":
      return amount / 52;
  }
}

export function fromWeeklyAmount(
  weeklyAmount: number,
  frequency: SavingsFrequency,
): number {
  switch (frequency) {
    case "day":
      return weeklyAmount / 7;
    case "week":
      return weeklyAmount;
    case "two-weeks":
      return weeklyAmount * 2;
    case "month":
      return (weeklyAmount * 52) / 12;
    case "year":
      return weeklyAmount * 52;
  }
}

export function roundMoney(amount: number): number {
  return Math.max(1, Math.round(amount));
}
