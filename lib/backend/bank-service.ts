import { randomUUID } from "node:crypto";
import { requireActiveAccount } from "./goals-service";
import type { DataStore } from "./store";
import { buildSandboxAccounts, jitterBalanceCents } from "./sandbox-bank";
import { resolveBankLogo } from "@/lib/bank-logos";
import { searchInstitutions } from "./plaid/institutions";
import {
  createLinkToken,
  createPublicToken,
  exchangePublicToken,
  getLinkToken,
  rememberAccessToken,
} from "./plaid/tokens";
import type {
  BankAccountRecord,
  BankConnectionRecord,
  PublicBankConnection,
  PublicNetWorth,
} from "./bank-types";
import { ApiError, type UserRecord } from "./types";

class MockBankUnavailableError extends Error {
  constructor(message = "Balances could not be refreshed right now.") {
    super(message);
    this.name = "MockBankUnavailableError";
  }
}

function loadSandboxAccounts(bank: { id: string; name: string }) {
  if (process.env.MOCK_BANK_FORCE_FAIL === "1") {
    throw new MockBankUnavailableError();
  }
  return buildSandboxAccounts(bank);
}

function toPublicConnection(
  connection: BankConnectionRecord,
  accounts: BankAccountRecord[],
): PublicBankConnection {
  return {
    id: connection.id,
    bankId: connection.bankId,
    bankName: connection.bankName,
    bankCity: connection.bankCity,
    bankState: connection.bankState,
    domain: connection.domain,
    logoUrl: resolveBankLogo({
      id: connection.institutionId ?? connection.bankId,
      name: connection.bankName,
      domain: connection.domain,
    }),
    itemId: connection.itemId,
    institutionId: connection.institutionId,
    connectedAt: connection.connectedAt,
    lastRefreshedAt: connection.lastRefreshedAt,
    accounts: accounts.map((account) => ({
      id: account.id,
      connectionId: account.connectionId,
      name: account.name,
      accountType: account.accountType,
      balance: account.balanceCents / 100,
      lastUpdatedAt: account.lastUpdatedAt,
    })),
  };
}

export class BankService {
  constructor(private readonly store: DataStore) {}

  async list(user: UserRecord) {
    requireActiveAccount(user);
    const connections = await this.store.listBankConnections(user.id);
    const accounts = await this.store.listBankAccounts(user.id);
    return {
      connections: connections.map((connection) =>
        toPublicConnection(
          connection,
          accounts.filter((account) => account.connectionId === connection.id),
        ),
      ),
      netWorth: this.netWorth(accounts),
    };
  }

  async createLinkToken(user: UserRecord) {
    requireActiveAccount(user);
    if (user.ageGroup === "minor" && user.status !== "active") {
      throw new ApiError(
        403,
        "Students under 18 need parent or guardian approval before connecting a bank.",
      );
    }
    return createLinkToken(user.id);
  }

  async searchInstitutions(user: UserRecord, query: string) {
    requireActiveAccount(user);
    return searchInstitutions(query);
  }

  async completeLink(
    user: UserRecord,
    input: {
      link_token?: unknown;
      institution?: {
        id?: unknown;
        name?: unknown;
        city?: unknown;
        state?: unknown;
        domain?: unknown;
      };
      username?: unknown;
      password?: unknown;
    },
  ) {
    requireActiveAccount(user);

    const linkToken =
      typeof input.link_token === "string" ? input.link_token.trim() : "";
    const institutionId =
      typeof input.institution?.id === "string"
        ? input.institution.id.trim()
        : "";
    const institutionName =
      typeof input.institution?.name === "string"
        ? input.institution.name.trim()
        : "";
    const institutionCity =
      typeof input.institution?.city === "string"
        ? input.institution.city.trim()
        : "";
    const institutionState =
      typeof input.institution?.state === "string"
        ? input.institution.state.trim()
        : "";
    const domain =
      typeof input.institution?.domain === "string"
        ? input.institution.domain.trim().replace(/^www\./i, "").toLowerCase()
        : "";

    const session = getLinkToken(linkToken);
    if (!session || session.userId !== user.id) {
      throw new ApiError(400, "This Link session expired. Open Link again.");
    }

    if (!institutionId || !institutionName) {
      throw new ApiError(400, "Choose a bank to continue.");
    }

    const username =
      typeof input.username === "string" ? input.username.trim() : "";
    const password =
      typeof input.password === "string" ? input.password : "";

    if (!username || !password) {
      throw new ApiError(400, "Enter your username and password to continue.", {
        ...(username ? {} : { username: "Username is required." }),
        ...(password ? {} : { password: "Password is required." }),
      });
    }

    const existing = (await this.store.listBankConnections(user.id)).find(
      (item) =>
        item.bankId === institutionId || item.institutionId === institutionId,
    );
    if (existing) {
      throw new ApiError(409, "That bank is already connected.");
    }

    const publicSession = createPublicToken({
      userId: user.id,
      institutionId,
      institutionName,
      institutionCity,
      institutionState,
      domain,
    });

    return {
      public_token: publicSession.publicToken,
      metadata: {
        institution: {
          institution_id: institutionId,
          name: institutionName,
          domain,
        },
        accounts: loadSandboxAccounts({
          id: institutionId,
          name: institutionName,
        }).map((account) => ({
          id: account.externalId,
          name: account.name,
          type: account.accountType,
          subtype: account.accountType,
        })),
      },
    };
  }

  async exchangePublicToken(user: UserRecord, publicTokenRaw: unknown) {
    requireActiveAccount(user);
    const publicToken =
      typeof publicTokenRaw === "string" ? publicTokenRaw.trim() : "";
    if (!publicToken) {
      throw new ApiError(400, "Missing public_token.");
    }

    const item = exchangePublicToken(publicToken, user.id);
    if (!item) {
      throw new ApiError(
        400,
        "That public_token is invalid or already used. Open Link again.",
      );
    }

    rememberAccessToken(item);

    const existing = (await this.store.listBankConnections(user.id)).find(
      (row) =>
        row.bankId === item.institutionId ||
        row.institutionId === item.institutionId,
    );
    if (existing) {
      throw new ApiError(409, "That bank is already connected.");
    }

    const now = new Date().toISOString();
    const connection: BankConnectionRecord = {
      id: randomUUID(),
      userId: user.id,
      bankId: item.institutionId,
      bankName: item.institutionName,
      bankCity: item.institutionCity,
      bankState: item.institutionState,
      domain: item.domain || null,
      itemId: item.itemId,
      accessToken: item.accessToken,
      institutionId: item.institutionId,
      connectedAt: now,
      lastRefreshedAt: now,
    };
    await this.store.createBankConnection(connection);

    const accounts = loadSandboxAccounts({
      id: item.institutionId,
      name: item.institutionName,
    }).map(
      (blueprint) =>
        ({
          id: randomUUID(),
          connectionId: connection.id,
          userId: user.id,
          externalId: blueprint.externalId,
          name: blueprint.name,
          accountType: blueprint.accountType,
          balanceCents: blueprint.balanceCents,
          currency: "USD",
          lastUpdatedAt: now,
        }) satisfies BankAccountRecord,
    );
    await this.store.replaceBankAccounts(connection.id, accounts);

    return {
      item_id: item.itemId,
      connection: toPublicConnection(connection, accounts),
    };
  }

  async disconnect(user: UserRecord, connectionId: string) {
    requireActiveAccount(user);
    const existing = await this.store.getBankConnection(connectionId, user.id);
    if (!existing) {
      throw new ApiError(404, "That bank connection was not found.");
    }

    const accounts = await this.store.listBankAccountsByConnection(connectionId);
    const accountIds = new Set(accounts.map((account) => account.id));
    const goals = await this.store.listGoals(user.id);
    for (const goal of goals) {
      if (goal.linkedAccountId && accountIds.has(goal.linkedAccountId)) {
        await this.store.updateGoal({
          ...goal,
          linkedAccountId: null,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const deleted = await this.store.deleteBankConnection(connectionId, user.id);
    if (!deleted) {
      throw new ApiError(404, "That bank connection was not found.");
    }
  }

  async refresh(user: UserRecord, connectionId?: string) {
    requireActiveAccount(user);
    const connections = connectionId
      ? [
          await this.store.getBankConnection(connectionId, user.id),
        ].filter((item): item is BankConnectionRecord => Boolean(item))
      : await this.store.listBankConnections(user.id);

    if (connectionId && connections.length === 0) {
      throw new ApiError(404, "That bank connection was not found.");
    }

    const now = new Date().toISOString();
    const refreshed: PublicBankConnection[] = [];

    try {
      for (const connection of connections) {
        const existingAccounts = await this.store.listBankAccountsByConnection(
          connection.id,
        );
        const accounts =
          existingAccounts.length > 0
            ? existingAccounts.map(
                (account) =>
                  ({
                    ...account,
                    balanceCents: jitterBalanceCents(account.balanceCents),
                    lastUpdatedAt: now,
                  }) satisfies BankAccountRecord,
              )
            : loadSandboxAccounts({
                id: connection.bankId,
                name: connection.bankName,
              }).map(
                (blueprint) =>
                  ({
                    id: randomUUID(),
                    connectionId: connection.id,
                    userId: user.id,
                    externalId: blueprint.externalId,
                    name: blueprint.name,
                    accountType: blueprint.accountType,
                    balanceCents: blueprint.balanceCents,
                    currency: "USD",
                    lastUpdatedAt: now,
                  }) satisfies BankAccountRecord,
              );
        await this.store.replaceBankAccounts(connection.id, accounts);
        const updated = {
          ...connection,
          lastRefreshedAt: now,
        };
        await this.store.updateBankConnection(updated);

        for (const goal of await this.store.listGoals(user.id)) {
          if (!goal.linkedAccountId) {
            continue;
          }
          const linked = accounts.find(
            (account) => account.id === goal.linkedAccountId,
          );
          if (!linked) {
            continue;
          }
          await this.store.updateGoal({
            ...goal,
            currentAmountCents: Math.max(0, linked.balanceCents),
            updatedAt: now,
          });
        }

        refreshed.push(toPublicConnection(updated, accounts));
      }
    } catch (error) {
      if (error instanceof MockBankUnavailableError) {
        throw new ApiError(
          503,
          "Balances could not be refreshed right now. Your last known balances are still shown.",
        );
      }
      throw error;
    }

    const allAccounts = await this.store.listBankAccounts(user.id);
    return {
      connections: refreshed,
      netWorth: this.netWorth(allAccounts),
    };
  }

  private netWorth(accounts: BankAccountRecord[]): PublicNetWorth {
    let assets = 0;
    let debts = 0;
    let lastRefreshedAt: string | null = null;
    for (const account of accounts) {
      if (account.balanceCents >= 0) {
        assets += account.balanceCents;
      } else {
        debts += Math.abs(account.balanceCents);
      }
      if (
        !lastRefreshedAt ||
        account.lastUpdatedAt.localeCompare(lastRefreshedAt) > 0
      ) {
        lastRefreshedAt = account.lastUpdatedAt;
      }
    }
    return {
      assets: assets / 100,
      debts: debts / 100,
      netWorth: (assets - debts) / 100,
      lastRefreshedAt,
    };
  }
}
