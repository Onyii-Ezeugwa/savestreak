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

/**
 * Nudge an existing balance on refresh so amounts move like live data
 * without wiping the account set.
 */
export function jitterBalanceCents(balanceCents: number) {
  const sign = balanceCents < 0 ? -1 : 1;
  const absolute = Math.abs(balanceCents);
  // Move by about 0.5% to 6%, plus a small cent-level wobble.
  const basisPoints = randInt(5, 60);
  const delta = Math.round((absolute * basisPoints) / 10000) + randInt(0, 175);
  const direction = chance(50) ? 1 : -1;
  const next = Math.max(0, absolute + direction * delta);
  return sign * next;
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
