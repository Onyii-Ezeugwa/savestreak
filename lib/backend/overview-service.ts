import { accountPosition, netWorthHistory } from "./account-position";
import { requireActiveAccount } from "./goals-service";
import type { DataStore } from "./store";
import type { UserRecord } from "./types";

export async function financialOverview(store: DataStore, user: UserRecord) {
  requireActiveAccount(user);
  const [accounts, connections, snapshots] = await Promise.all([
    store.listBankAccounts(user.id),
    store.listBankConnections(user.id),
    store.listBalanceSnapshots(user.id),
  ]);
  const position = accountPosition(accounts);
  const bankName = new Map(connections.map((connection) => [connection.id, connection.bankName]));
  const history = netWorthHistory(snapshots);

  return {
    connected: accounts.length > 0,
    savings: position.savingsCents / 100,
    cash: position.cashCents / 100,
    investments: position.investmentsCents / 100,
    debts: position.debtsCents / 100,
    netWorth: position.netWorthCents / 100,
    accounts: accounts
      .map((account) => ({
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        bankName: bankName.get(account.connectionId) ?? "",
        balance: account.balanceCents / 100,
        lastUpdatedAt: account.lastUpdatedAt,
      }))
      .sort((a, b) => a.bankName.localeCompare(b.bankName) || a.name.localeCompare(b.name)),
    history,
  };
}
