import type { BankAccountRecord } from "./bank-types";
import type { BalanceSnapshotRecord } from "./habit-types";

export function accountPosition(accounts: BankAccountRecord[]) {
  let savingsCents = 0;
  let cashCents = 0;
  let investmentsCents = 0;
  let debtsCents = 0;

  for (const account of accounts) {
    if (account.accountType === "savings") {
      savingsCents += Math.max(0, account.balanceCents);
    } else if (account.accountType === "checking") {
      cashCents += Math.max(0, account.balanceCents);
    } else if (account.accountType === "investment") {
      investmentsCents += Math.max(0, account.balanceCents);
    } else if (account.accountType === "credit" || account.accountType === "loan") {
      debtsCents += Math.abs(account.balanceCents);
    }
  }

  const assetsCents = savingsCents + cashCents + investmentsCents;
  return {
    savingsCents,
    cashCents,
    investmentsCents,
    debtsCents,
    assetsCents,
    netWorthCents: assetsCents - debtsCents,
  };
}

export function netWorthHistory(snapshots: BalanceSnapshotRecord[]) {
  return [...snapshots]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map((snapshot) => ({
      capturedAt: snapshot.capturedAt,
      netWorth: (snapshot.netWorthCents ?? snapshot.savingsCents) / 100,
      partial: snapshot.netWorthCents == null,
    }));
}
