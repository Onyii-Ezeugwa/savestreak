import { randomInt } from "node:crypto";
import type { BankAccountType, BankDirectoryOption } from "./bank-types";

export interface SandboxAccountBlueprint {
  externalId: string;
  name: string;
  accountType: BankAccountType;
  balanceCents: number;
}

/** Inclusive random integer in [min, max]. */
function randInt(min: number, max: number) {
  return randomInt(min, max + 1);
}

/** Random dollar amount with cents, in [minDollars, maxDollars]. */
function randomBalanceCents(minDollars: number, maxDollars: number) {
  const minCents = Math.round(minDollars * 100);
  const maxCents = Math.round(maxDollars * 100);
  return randInt(minCents, maxCents);
}

function chance(percent: number) {
  return randInt(1, 100) <= percent;
}

function sameLocalDay(iso: string, now: Date) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return false;
  }
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}

/**
 * Posted balance for a refresh. The same calendar day keeps the last
 * reading. A new day moves each account the way a normal one would:
 * checking by everyday spending, savings mostly still, investments by a
 * fraction of a percent, a card by small charges or a payment, and a
 * loan by little or no interest.
 */
export function nextPostedBalanceCents(input: {
  accountType: BankAccountType;
  balanceCents: number;
  lastUpdatedAt: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (sameLocalDay(input.lastUpdatedAt, now)) {
    return input.balanceCents;
  }
  return driftForNewDay(input.accountType, input.balanceCents);
}

function driftForNewDay(accountType: BankAccountType, balanceCents: number) {
  if (accountType === "checking") {
    const delta = randInt(-4200, 1600);
    const floor = balanceCents > 2500 ? 2000 : 0;
    return Math.max(floor, balanceCents + delta);
  }
  if (accountType === "savings") {
    if (!chance(25)) {
      return balanceCents;
    }
    return balanceCents + randInt(15, 350);
  }
  if (accountType === "investment") {
    const basisPoints = randInt(-35, 45);
    return Math.max(0, balanceCents + Math.round((balanceCents * basisPoints) / 10000));
  }
  const owed = Math.abs(balanceCents);
  if (accountType === "loan") {
    if (!chance(15)) {
      return -owed;
    }
    return -(owed + randInt(50, 800));
  }
  if (accountType === "credit") {
    if (chance(30)) {
      const payment = Math.min(owed, randInt(1500, 7500));
      return -(owed - payment);
    }
    return -(owed + randInt(400, 2800));
  }
  return balanceCents;
}

export function buildSandboxAccounts(
  bank: Pick<BankDirectoryOption, "id" | "name">,
): SandboxAccountBlueprint[] {
  const shortName = bank.name.split(",")[0]?.trim() || bank.name;

  const accounts: SandboxAccountBlueprint[] = [
    {
      externalId: `${bank.id}-checking`,
      name: `${shortName} Checking`,
      accountType: "checking",
      // Typical student checking: a bit of cash on hand
      balanceCents: randomBalanceCents(42.17, 3280.94),
    },
    {
      externalId: `${bank.id}-savings`,
      name: `${shortName} Savings`,
      accountType: "savings",
      // Emergency / goal savings
      balanceCents: randomBalanceCents(15.5, 9125.4),
    },
  ];

  if (chance(55)) {
    accounts.push({
      externalId: `${bank.id}-investment`,
      name: `${shortName} Brokerage`,
      accountType: "investment",
      balanceCents: randomBalanceCents(120.0, 6840.75),
    });
  }

  accounts.push({
    externalId: `${bank.id}-credit`,
    name: `${shortName} Credit Card`,
    accountType: "credit",
    // Outstanding card balance (shown as negative)
    balanceCents: -randomBalanceCents(18.25, 2140.6),
  });

  if (chance(45)) {
    accounts.push({
      externalId: `${bank.id}-loan`,
      name: `${shortName} Student Loan`,
      accountType: "loan",
      balanceCents: -randomBalanceCents(850.0, 28450.0),
    });
  }

  return accounts;
}
