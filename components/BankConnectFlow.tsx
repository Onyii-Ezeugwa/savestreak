"use client";

import { BackLink } from "@/components/BackLink";
import { Button } from "@/components/Button";
import { BankLogo } from "@/components/BankLogo";
import { PlaidLinkModal } from "@/components/PlaidLinkModal";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type ApiErrorPayload,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { Link2, Loader2, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BankAccountView {
  id: string;
  name: string;
  accountType: string;
  balance: number;
  lastUpdatedAt: string;
}

interface BankConnectionView {
  id: string;
  bankId: string;
  bankName: string;
  bankCity: string;
  bankState: string;
  domain?: string | null;
  logoUrl?: string;
  institutionId?: string | null;
  connectedAt: string;
  lastRefreshedAt: string;
  accounts: BankAccountView[];
}

interface NetWorthView {
  assets: number;
  debts: number;
  netWorth: number;
  lastRefreshedAt: string | null;
}

const ACCOUNT_TYPE: Record<string, { label: string; chip: string }> = {
  checking: { label: "Checking", chip: "bg-slateblue/10 text-slateblue" },
  savings: { label: "Savings", chip: "bg-teal/10 text-teal" },
  investment: { label: "Investment", chip: "bg-gold/15 text-ink" },
  credit: { label: "Credit card", chip: "bg-berry/10 text-berry" },
  loan: { label: "Loan", chip: "bg-orange/10 text-orange" },
};

const STEPS = [
  {
    title: "Choose a bank",
    body: "Search US institutions inside Link.",
  },
  {
    title: "Sign in there",
    body: "The password stays in that window. $aveStreak never stores it.",
  },
  {
    title: "See the accounts",
    body: "Checking, savings, cards, and loans show up on the right.",
  },
];

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BankConnectFlow() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = useState<BankConnectionView[]>([]);
  const [netWorth, setNetWorth] = useState<NetWorthView | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [openingLink, setOpeningLink] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status === "active") {
      void loadConnections();
    }
  }, [user]);

  async function loadConnections() {
    try {
      const payload = await apiRequest<{
        connections: BankConnectionView[];
        netWorth: NetWorthView;
      }>("/bank-connections");
      setConnections(payload.connections);
      setNetWorth(payload.netWorth);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    }
  }

  async function openLink() {
    setOpeningLink(true);
    setError(null);
    try {
      const payload = await apiRequest<{ link_token: string }>(
        "/plaid/create-link-token",
        { method: "POST" },
      );
      setLinkToken(payload.link_token);
      setLinkOpen(true);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setOpeningLink(false);
    }
  }

  async function onLinkSuccess(publicToken: string) {
    await apiRequest("/plaid/exchange", {
      method: "POST",
      body: JSON.stringify({ public_token: publicToken }),
    });
    setLinkOpen(false);
    setLinkToken(null);
    await loadConnections();
  }

  async function onDisconnect(id: string) {
    setError(null);
    try {
      await apiRequest(`/bank-connections/${id}`, { method: "DELETE" });
      await loadConnections();
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    }
  }

  async function refreshBalances() {
    setError(null);
    setRefreshing(true);
    try {
      await apiRequest("/bank-connections/refresh", { method: "POST" });
      await loadConnections();
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
      await loadConnections();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="game-panel rounded-3xl p-8">
        <p className="text-sm text-muted">Loading bank connections...</p>
      </div>
    );
  }

  if (user.status !== "active") {
    return (
      <div className="flex items-start gap-4">
        <BackLink />
        <div className="game-panel rounded-3xl p-8">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            <Lock size={14} aria-hidden="true" />
            Locked
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">Waiting on approval</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Students under 18 need a parent or guardian to approve the account
            before a bank can be connected.
          </p>
          <Button href="/profile" className="mt-5" size="sm">
            Open profile
          </Button>
        </div>
      </div>
    );
  }

  const accountCount = connections.reduce(
    (sum, connection) => sum + connection.accounts.length,
    0,
  );
  const scale = netWorth
    ? Math.max(netWorth.assets, netWorth.debts, 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Banks
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Connect a bank</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Link a US bank, then keep the balances here. The password is entered
            inside Link and is not saved.
          </p>
        </div>
      </div>

      {connections.length > 0 && netWorth ? (
        <div className="game-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Net worth
              </p>
              <p className="mt-3 font-display text-5xl leading-none text-ink">
                {MONEY.format(netWorth.netWorth)}
              </p>
              <p className="mt-3 text-sm text-muted">
                Checking, savings, and investments, minus debts.
                {netWorth.lastRefreshedAt
                  ? ` Updated ${formatWhen(netWorth.lastRefreshedAt)}.`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={refreshing}
              aria-busy={refreshing}
              onClick={() => void refreshBalances()}
            >
              {refreshing ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
              {refreshing ? "Refreshing..." : "Refresh balances"}
            </Button>
          </div>
          <div className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            <AmountBar
              label="Assets"
              value={netWorth.assets}
              width={(netWorth.assets / scale) * 100}
              barClass="bg-teal"
            />
            <AmountBar
              label="Debts"
              value={netWorth.debts}
              width={(netWorth.debts / scale) * 100}
              barClass="bg-berry"
            />
          </div>
        </div>
      ) : null}

      {connections.length === 0 ? (
        <div className="grid items-start gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="game-panel rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-teal" aria-hidden="true" />
              <h2 className="font-display text-2xl text-ink">Add a bank</h2>
            </div>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-muted">
                      {step.body}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}
            <Button
              type="button"
              disabled={openingLink}
              onClick={() => void openLink()}
              className="mt-5 w-full"
            >
              {openingLink ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Link2 size={16} aria-hidden="true" />
              )}
              {openingLink ? "Starting Link..." : "Connect with Link"}
            </Button>
          </div>
          <section className="game-panel rounded-3xl px-5 py-8">
            <h2 className="font-display text-2xl text-ink">Your banks</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Connect a bank and each institution gets its own card, with a
              balance for every account.
            </p>
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">Your banks</h2>
              <p className="mt-1 text-sm text-muted">
                {connections.length} linked · {accountCount} accounts
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={openingLink}
              onClick={() => void openLink()}
            >
              {openingLink ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Link2 size={14} aria-hidden="true" />
              )}
              {openingLink ? "Starting Link..." : "Add a bank"}
            </Button>
          </div>
          {error ? <p className="text-sm text-orange">{error}</p> : null}
          <div
            className={cn(
              "grid items-start gap-4",
              connections.length > 1 && "lg:grid-cols-2",
            )}
          >
            {connections.map((connection) => (
              <article
                key={connection.id}
                className="game-panel overflow-hidden rounded-3xl"
              >
                <div className="flex items-center gap-3 px-5 py-4">
                  <BankLogo
                    id={connection.institutionId ?? connection.bankId}
                    name={connection.bankName}
                    domain={connection.domain}
                    logoUrl={connection.logoUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xl text-ink">
                      {connection.bankName}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {[connection.bankCity, connection.bankState]
                        .filter(Boolean)
                        .join(", ") || "US bank"}
                      {connection.lastRefreshedAt
                        ? ` · ${formatWhen(connection.lastRefreshedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void onDisconnect(connection.id)}
                  >
                    Disconnect
                  </Button>
                </div>
                <ul
                  className={cn(
                    "grid gap-px border-t border-line bg-line",
                    connections.length === 1 && "sm:grid-cols-2",
                  )}
                >
                  {connection.accounts.map((account) => {
                    const type = ACCOUNT_TYPE[account.accountType];
                    return (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-3 bg-card px-5 py-3.5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {account.name}
                          </span>
                          <span
                            className={cn(
                              "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                              type?.chip ?? "bg-cream-dark text-muted",
                            )}
                          >
                            {type?.label ?? account.accountType}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-semibold",
                            account.balance < 0 ? "text-berry" : "text-ink",
                          )}
                        >
                          {MONEY.format(account.balance)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      <PlaidLinkModal
        open={linkOpen}
        linkToken={linkToken}
        onClose={() => {
          setLinkOpen(false);
          setLinkToken(null);
        }}
        onSuccess={onLinkSuccess}
      />
    </div>
  );
}

function AmountBar({
  label,
  value,
  width,
  barClass,
}: {
  label: string;
  value: number;
  width: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <p className="font-semibold text-ink">{MONEY.format(value)}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-dark">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${Math.max(width, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}
