import {
  addCalendarDays,
  formatDateInputValue,
  formatDisplayDate,
  parseDateOnly,
  startOfToday,
} from "@/lib/dates";
import { requiredSavings } from "@/lib/goal-progress";

export type CatchUpKind = "weekly" | "date" | "amount";

export interface CatchUpDraft {
  kind: CatchUpKind;
  title: string;
  detail: string;
  effect: string;
  weeklyCents: number;
  targetAmountCents: number | null;
  targetDate: string | null;
}

function dollars(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function weeksBetween(from: Date, to: Date) {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000 / 7));
}

export function buildCatchUpDrafts(input: {
  currentAmountCents: number;
  targetAmountCents: number;
  targetDate: string;
  createdAt: string;
  today?: Date;
}): CatchUpDraft[] {
  const today = input.today ?? startOfToday();
  const target = parseDateOnly(input.targetDate);
  const created = parseDateOnly(input.createdAt.slice(0, 10));
  if (!target || !created) {
    return [];
  }
  const remaining = input.targetAmountCents - input.currentAmountCents;
  if (remaining <= 0 || input.targetAmountCents <= 0) {
    return [];
  }

  const elapsedDays = Math.max(
    7,
    Math.round((today.getTime() - created.getTime()) / 86_400_000),
  );
  const actualWeekly = Math.max(
    100,
    Math.round(input.currentAmountCents / Math.max(1, elapsedDays / 7)),
  );
  const drafts: CatchUpDraft[] = [];

  const paceWeeks = Math.max(2, Math.ceil(remaining / actualWeekly));
  let later = addCalendarDays(today, paceWeeks * 7);
  if (later.getTime() <= target.getTime()) {
    later = addCalendarDays(target, 14);
  }
  const laterIso = formatDateInputValue(later);
  const laterWeekly = Math.ceil(remaining / weeksBetween(today, later));
  drafts.push({
    kind: "date",
    title: "Give this goal more time",
    detail:
      "Move the date out so the weekly amount stays close to the pace you have kept so far.",
    effect: `Target date becomes ${formatDisplayDate(laterIso)}. About ${dollars(laterWeekly)} a week.`,
    weeklyCents: laterWeekly,
    targetAmountCents: input.targetAmountCents,
    targetDate: laterIso,
  });

  const amountDeadline = target.getTime() >= today.getTime() ? target : addCalendarDays(today, 56);
  const amountWeeks = weeksBetween(today, amountDeadline);
  const reachable = input.currentAmountCents + actualWeekly * amountWeeks;
  const lower = Math.min(
    input.targetAmountCents - 100,
    Math.max(input.currentAmountCents + 100, reachable),
  );
  if (lower > input.currentAmountCents && lower < input.targetAmountCents) {
    const lowerWeekly = Math.ceil((lower - input.currentAmountCents) / amountWeeks);
    const lowerDate =
      target.getTime() >= today.getTime() ? input.targetDate : formatDateInputValue(amountDeadline);
    drafts.push({
      kind: "amount",
      title: "Aim for a smaller target",
      detail: "Lower the target so it fits the pace you have already kept.",
      effect:
        lowerDate === input.targetDate
          ? `Target becomes ${dollars(lower)}. About ${dollars(lowerWeekly)} a week.`
          : `Target becomes ${dollars(lower)} by ${formatDisplayDate(lowerDate)}. About ${dollars(lowerWeekly)} a week.`,
      weeklyCents: lowerWeekly,
      targetAmountCents: lower,
      targetDate: lowerDate,
    });
  }

  if (target.getTime() >= today.getTime()) {
    const required = requiredSavings({
      currentAmountCents: input.currentAmountCents,
      targetAmountCents: input.targetAmountCents,
      targetDate: input.targetDate,
      today,
    });
    if (required && required.weeklyCents > laterWeekly) {
      drafts.push({
        kind: "weekly",
        title: "Save more each week",
        detail: "Keep the same target and date, and set aside more each week to catch up.",
        effect: `Weekly savings become ${dollars(required.weeklyCents)}. The target stays ${dollars(input.targetAmountCents)} by ${formatDisplayDate(input.targetDate)}.`,
        weeklyCents: required.weeklyCents,
        targetAmountCents: null,
        targetDate: null,
      });
    }
  } else {
    const sprintDate = addCalendarDays(today, 28);
    const sprintWeekly = Math.ceil(remaining / 4);
    drafts.push({
      kind: "weekly",
      title: "Catch up over the next month",
      detail: "Keep the target amount and finish it over the next four weeks.",
      effect: `Weekly savings become ${dollars(sprintWeekly)} through ${formatDisplayDate(formatDateInputValue(sprintDate))}.`,
      weeklyCents: sprintWeekly,
      targetAmountCents: input.targetAmountCents,
      targetDate: formatDateInputValue(sprintDate),
    });
  }

  return drafts.slice(0, 3);
}
