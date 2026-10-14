"use client";

import { Button } from "@/components/Button";
import { BankLogo } from "@/components/BankLogo";
import { PlaidLinkModal } from "@/components/PlaidLinkModal";
import { useAuth } from "@/components/AuthProvider";
import {
  apiRequest,
  type ApiErrorPayload,
} from "@/lib/api";
import { Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BankAccountView {
  id: string;
  name: string;
  accountType: string;
  balance: number;
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
  accounts: BankAccountView[];
}

interface NetWorthView {
  assets: number;
  debts: number;
  netWorth: number;
}

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

  if (loading || !user) {
    return <p className="text-sm text-muted">Loading bank connections...</p>;
  }

  if (user.status !== "active") {
    return (
      <div className="rounded-3xl border border-gold/40 bg-gold/10 p-6">
        <h1 className="font-display text-3xl text-ink">Bank connect locked</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Students under 18 need parent or guardian approval before connecting a
          bank account. Finish consent first, then come back here.
        </p>
        <Button href="/dashboard" className="mt-5">
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
          Bank Link
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Connect a US bank</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Open Link, choose your institution, and sign in. $aveStreak never
          stores your bank password.
        </p>
      </div>

      {netWorth ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Assets" value={MONEY.format(netWorth.assets)} />
          <Stat label="Debts" value={MONEY.format(netWorth.debts)} />
          <Stat label="Net worth" value={MONEY.format(netWorth.netWorth)} />
        </div>
      ) : null}

      <div className="game-panel flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <Link2 size={16} className="text-teal" aria-hidden="true" />
            Launch Link
          </p>
        </div>
        <Button
          type="button"
          disabled={openingLink}
          onClick={() => void openLink()}
        >
          {openingLink ? "Starting Link..." : "Connect with Link"}
        </Button>
      </div>

      {error ? <p className="text-sm text-orange">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Connected banks</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm font-medium text-teal hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline"
              disabled={refreshing || connections.length === 0}
              aria-busy={refreshing}
              onClick={async () => {
                setError(null);
                setRefreshing(true);
                try {
                  await apiRequest("/bank-connections/refresh", {
                    method: "POST",
                  });
                  await loadConnections();
                } catch (caught) {
                  setError((caught as ApiErrorPayload).error);
                  await loadConnections();
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              {refreshing ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  Refreshing...
                </>
              ) : (
                "Refresh balances"
              )}
            </button>
            <Link href="/dashboard" className="text-sm font-medium text-teal hover:underline">
              Back to dashboard
            </Link>
          </div>
        </div>
        {connections.length === 0 ? (
          <p className="text-sm text-muted">No banks connected yet.</p>
        ) : (
          connections.map((connection) => (
            <article key={connection.id} className="game-panel rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BankLogo
                    id={connection.institutionId ?? connection.bankId}
                    name={connection.bankName}
                    domain={connection.domain}
                    logoUrl={connection.logoUrl}
                    size="lg"
                  />
                  <div>
                    <h3 className="font-display text-xl text-ink">
                      {connection.bankName}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {[connection.bankCity, connection.bankState]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
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
              <ul className="mt-4 space-y-2">
                {connection.accounts.map((account) => (
                  <li
                    key={account.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium text-ink">{account.name}</span>
                      <span className="mt-0.5 block text-xs uppercase tracking-[0.12em] text-muted">
                        {account.accountType}
                      </span>
                    </span>
                    <span className="font-semibold text-ink">
                      {MONEY.format(account.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="game-panel rounded-3xl p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
