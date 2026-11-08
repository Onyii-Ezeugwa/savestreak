"use client";

import { Button } from "@/components/Button";
import { NetWorthChart } from "@/components/NetWorthChart";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { Landmark, Lock, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

interface Overview {
  connected: boolean;
  savings: number;
  cash: number;
  investments: number;
  debts: number;
  netWorth: number;
  accounts: Array<{
    id: string;
    name: string;
    accountType: string;
    bankName: string;
    balance: number;
    lastUpdatedAt: string;
  }>;
  history: Array<{ capturedAt: string; netWorth: number; partial: boolean }>;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const TYPE_STYLE: Record<string, { label: string; bar: string; chip: string }> = {
  checking: { label: "Checking", bar: "bg-slateblue", chip: "bg-slateblue/10 text-slateblue" },
  savings: { label: "Savings", bar: "bg-teal", chip: "bg-teal/10 text-teal" },
  investment: { label: "Investment", bar: "bg-gold", chip: "bg-gold/15 text-ink" },
  credit: { label: "Credit", bar: "bg-berry", chip: "bg-berry/10 text-berry" },
  loan: { label: "Loan", bar: "bg-orange", chip: "bg-orange/10 text-orange" },
};

const BREAKDOWN = [
  { key: "savings" as const, label: "Savings", color: "bg-teal" },
  { key: "cash" as const, label: "Checking", color: "bg-slateblue" },
  { key: "investments" as const, label: "Investments", color: "bg-gold" },
  { key: "debts" as const, label: "Debts", color: "bg-berry" },
];

export default function OverviewPage() {
  const { user, loading } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.status !== "active") {
      return;
    }
    let active = true;
    apiRequest<Overview>("/overview")
      .then((payload) => {
        if (active) {
          setOverview(payload);
        }
      })
      .catch((caught: ApiErrorPayload) => {
        if (active) {
          setError(caught.error);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || (user?.status === "active" && !overview && !error)) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="game-panel rounded-3xl p-8">
          <p className="text-sm text-muted">Loading your overview...</p>
        </div>
      </section>
    );
  }

  const first = overview?.history[0];
  const latest = overview?.history[overview.history.length - 1];
  const delta =
    first && latest && overview.history.length > 1
      ? latest.netWorth - first.netWorth
      : null;
  const scale = overview
    ? Math.max(overview.savings + overview.cash + overview.investments, overview.debts, 1)
    : 1;

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-6 lg:px-8">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Money
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Financial overview</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Savings, investments, and debts from the banks you have connected.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      {user && user.status !== "active" ? (
        <div className="game-panel rounded-3xl p-8">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
            <Lock size={14} aria-hidden="true" />
            Locked
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink">Waiting on approval</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            This overview stays locked until a parent or guardian approves the
            account.
          </p>
          <Button href="/profile" className="mt-5" size="sm">
            Open profile
          </Button>
        </div>
      ) : null}

      {overview && !overview.connected ? (
        <div className="game-panel rounded-3xl p-8">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal">
            <Landmark size={14} aria-hidden="true" />
            No bank yet
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink">Connect a bank</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Connect a bank to see savings, investments, debts, and how your net
            worth changes.
          </p>
          <Button href="/connect-bank" className="mt-5" size="sm">
            Connect a bank
          </Button>
        </div>
      ) : null}

      {overview?.connected ? (
        <>
          <div className="game-panel rounded-3xl p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-end">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  <Wallet size={14} aria-hidden="true" />
                  Net worth
                </p>
                <p className="mt-3 font-display text-5xl leading-none text-ink">
                  {MONEY.format(overview.netWorth)}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Checking, savings, and investments, minus debts.
                </p>
                {delta !== null && first ? (
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      delta > 0 ? "text-green" : delta < 0 ? "text-berry" : "text-muted"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {MONEY.format(delta)} since{" "}
                    {new Date(first.capturedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                ) : overview.history.length === 1 ? (
                  <p className="mt-3 text-sm text-muted">
                    One reading so far. Refresh later to see the change.
                  </p>
                ) : null}
              </div>
              <NetWorthChart points={overview.history} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BREAKDOWN.map((item) => (
              <div key={item.key} className="game-panel rounded-3xl p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  <span className={`size-2.5 rounded-full ${item.color}`} aria-hidden="true" />
                  {item.label}
                </p>
                <p className="mt-3 font-display text-3xl text-ink">
                  {MONEY.format(overview[item.key])}
                </p>
              </div>
            ))}
          </div>

          <div className="game-panel rounded-3xl p-6">
            <h2 className="font-display text-2xl text-ink">How it splits</h2>
            <div className="mt-5 space-y-4">
              <SplitBar
                label="Assets"
                width={((overview.savings + overview.cash + overview.investments) / scale) * 100}
                segments={[
                  { amount: overview.savings, color: "bg-teal" },
                  { amount: overview.cash, color: "bg-slateblue" },
                  { amount: overview.investments, color: "bg-gold" },
                ]}
              />
              <SplitBar
                label="Debts"
                width={(overview.debts / scale) * 100}
                segments={[{ amount: overview.debts, color: "bg-berry" }]}
              />
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ink">Accounts</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {overview.accounts.map((account) => {
                const style = TYPE_STYLE[account.accountType] ?? {
                  label: account.accountType,
                  bar: "bg-muted",
                  chip: "bg-cream-dark text-ink",
                };
                return (
                  <li key={account.id} className="game-panel overflow-hidden rounded-3xl">
                    <div className="flex h-full">
                      <span className={`w-1.5 shrink-0 ${style.bar}`} aria-hidden="true" />
                      <div className="flex flex-1 items-start justify-between gap-3 p-5">
                        <div>
                          <p className="font-semibold text-ink">{account.name}</p>
                          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${style.chip}`}>
                              {style.label}
                            </span>
                            {account.bankName ? <span>{account.bankName}</span> : null}
                          </p>
                          <p className="mt-2 text-xs text-muted">
                            Updated{" "}
                            {new Date(account.lastUpdatedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <p className="font-display text-2xl text-ink">
                          {MONEY.format(account.balance)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
      <PageFooterNav />
    </section>
  );
}

function SplitBar({
  label,
  width,
  segments,
}: {
  label: string;
  width: number;
  segments: Array<{ amount: number; color: string }>;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-muted">{MONEY.format(total)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cream-dark">
        <div
          className="flex h-full overflow-hidden rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        >
          {segments.map((segment) =>
            total > 0 && segment.amount > 0 ? (
              <span
                key={segment.color}
                className={segment.color}
                style={{ width: `${(segment.amount / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
