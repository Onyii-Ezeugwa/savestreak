"use client";

import { Field } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";
import { BankLogo } from "@/components/BankLogo";
import {
  apiRequest,
  type ApiErrorPayload,
} from "@/lib/api";
import { ArrowLeft, Lock, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

interface Institution {
  id: string;
  name: string;
  city: string;
  state: string;
  domain?: string;
  logoUrl?: string;
}

interface LinkMetadata {
  institution: {
    institution_id: string;
    name: string;
  };
}

type LinkStep = "intro" | "search" | "credentials" | "connecting" | "success";

interface PlaidLinkModalProps {
  open: boolean;
  linkToken: string | null;
  onClose: () => void;
  onSuccess: (publicToken: string, metadata: LinkMetadata) => Promise<void>;
}

export function PlaidLinkModal({
  open,
  linkToken,
  onClose,
  onSuccess,
}: PlaidLinkModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<LinkStep>("intro");
  const [query, setQuery] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selected, setSelected] = useState<Institution | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep("intro");
    setQuery("");
    setInstitutions([]);
    setSelected(null);
    setUsername("");
    setPassword("");
    setError(null);
    setFieldErrors({});
    setSubmitting(false);
  }, [open, linkToken]);

  useEffect(() => {
    if (!open || step !== "search") {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadInstitutions(query);
    }, query.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [open, step, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  async function loadInstitutions(value: string) {
    setSearching(true);
    try {
      const payload = await apiRequest<{ institutions: Institution[] }>(
        `/plaid/institutions?q=${encodeURIComponent(value)}`,
      );
      setInstitutions(payload.institutions);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setSearching(false);
    }
  }

  function pickBank(bank: Institution) {
    setSelected(bank);
    setStep("credentials");
    setError(null);
    setFieldErrors({});
  }

  async function onSubmitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !linkToken) {
      setError("Open Link again to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    setStep("connecting");
    try {
      const completed = await apiRequest<{
        public_token: string;
        metadata: LinkMetadata;
      }>("/plaid/link/complete", {
        method: "POST",
        body: JSON.stringify({
          link_token: linkToken,
          institution: selected,
          username,
          password,
        }),
      });
      setStep("success");
      await onSuccess(completed.public_token, completed.metadata);
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error);
      setFieldErrors(payload.fieldErrors ?? {});
      setStep("credentials");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open) {
    return null;
  }

  const canGoBack = step === "search" || step === "credentials";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:max-h-[min(640px,88vh)] sm:rounded-[28px]"
      >
        <header className="flex shrink-0 items-center gap-3 px-5 pt-5 pb-3">
          {canGoBack ? (
            <button
              type="button"
              className="rounded-full p-2 text-[#111] hover:bg-black/5"
              aria-label="Go back"
              disabled={submitting}
              onClick={() => {
                setError(null);
                if (step === "credentials") {
                  setStep("search");
                  return;
                }
                setStep("intro");
              }}
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="w-9" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#0a85ea]">
              LINK
            </p>
            <h2 id={titleId} className="truncate text-[17px] font-semibold text-[#111]">
              {step === "credentials" && selected
                ? selected.name
                : "Connect your bank"}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[#111] hover:bg-black/5 disabled:opacity-50"
            aria-label="Close"
            disabled={submitting}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {step === "intro" ? (
            <div className="space-y-6 pt-2">
              <div className="space-y-2 text-center">
                <p className="text-[22px] leading-tight font-semibold text-[#111]">
                  $aveStreak uses Link to connect your account
                </p>
                <p className="text-[15px] leading-6 text-[#5a5a5a]">
                  Choose your bank, sign in, and we import your balances. Your
                  password never leaves this window.
                </p>
              </div>
              <ul className="space-y-3 rounded-2xl bg-[#f6f8fa] px-4 py-4 text-[14px] text-[#333]">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-[#0a85ea]" size={18} />
                  Encrypted connection for balances and account details
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="mt-0.5 shrink-0 text-[#0a85ea]" size={18} />
                  Your bank password stays in this window and is never stored
                </li>
              </ul>
              <button
                type="button"
                className="w-full rounded-full bg-[#0a85ea] px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-[#0976d1]"
                onClick={() => setStep("search")}
              >
                Continue
              </button>
            </div>
          ) : null}

          {step === "search" ? (
            <div className="space-y-4 pt-1">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8a8a8a]"
                  aria-hidden="true"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search 11,000+ institutions"
                  autoFocus
                  className="w-full rounded-xl border border-[#e6e6e6] bg-[#f6f8fa] py-3.5 pr-3.5 pl-11 text-[15px] text-[#111] outline-none placeholder:text-[#8a8a8a] focus:border-[#0a85ea] focus:bg-white focus:ring-2 focus:ring-[#0a85ea]/20"
                />
              </div>

              <div>
                <p className="mb-3 text-[12px] font-semibold tracking-[0.08em] text-[#8a8a8a] uppercase">
                  {query.trim() ? "Results" : "Popular banks"}
                  {searching ? " · searching" : ""}
                </p>

                {!query.trim() ? (
                  <div className="grid grid-cols-4 gap-x-2 gap-y-5">
                    {institutions.slice(0, 8).map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        title={bank.name}
                        className="group flex flex-col items-center gap-2 text-center"
                        onClick={() => pickBank(bank)}
                      >
                        <BankLogo
                          id={bank.id}
                          name={bank.name}
                          domain={bank.domain}
                          logoUrl={bank.logoUrl}
                          size="xl"
                          className="transition-transform group-hover:scale-105"
                        />
                        <span className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-snug font-medium text-[#111]">
                          {bank.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <ul className="divide-y divide-[#f0f0f0]">
                    {institutions.map((bank) => (
                      <li key={bank.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3.5 py-3.5 text-left hover:bg-[#fafafa]"
                          onClick={() => pickBank(bank)}
                        >
                          <BankLogo
                            id={bank.id}
                            name={bank.name}
                            domain={bank.domain}
                            logoUrl={bank.logoUrl}
                            size="lg"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-[#111]">
                              {bank.name}
                            </span>
                            <span className="block truncate text-[13px] text-[#8a8a8a]">
                              {[bank.city, bank.state].filter(Boolean).join(", ") ||
                                bank.domain ||
                                "US institution"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {institutions.length === 0 && !searching ? (
                  <p className="py-8 text-center text-[14px] text-[#8a8a8a]">
                    No banks matched that search.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "credentials" && selected ? (
            <form className="space-y-4 pt-2" onSubmit={onSubmitCredentials}>
              <div className="flex flex-col items-center gap-3 pb-2 text-center">
                <BankLogo
                  id={selected.id}
                  name={selected.name}
                  domain={selected.domain}
                  logoUrl={selected.logoUrl}
                  size="xl"
                />
                <p className="text-[14px] text-[#5a5a5a]">
                  Enter your {selected.name} online banking login
                </p>
              </div>
              <Field
                label="Username"
                autoComplete="off"
                value={username}
                error={fieldErrors.username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <PasswordField
                label="Password"
                autoComplete="off"
                value={password}
                error={fieldErrors.password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error ? <p className="text-[14px] text-orange">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#0a85ea] px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-[#0976d1] disabled:opacity-60"
              >
                Submit
              </button>
            </form>
          ) : null}

          {step === "connecting" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#0a85ea]/20 border-t-[#0a85ea]" />
              <p className="text-[16px] font-semibold text-[#111]">
                Connecting to {selected?.name}...
              </p>
              <p className="text-[13px] text-[#8a8a8a]">
                Exchanging tokens and loading accounts
              </p>
            </div>
          ) : null}

          {step === "success" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f8ef] text-green">
                <ShieldCheck size={28} />
              </span>
              <p className="text-[16px] font-semibold text-[#111]">Success</p>
              <p className="text-[13px] text-[#8a8a8a]">
                Your accounts are linked to $aveStreak.
              </p>
            </div>
          ) : null}

          {error && step !== "credentials" ? (
            <p className="mt-4 text-[14px] text-orange">{error}</p>
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-[#f0f0f0] px-5 py-3 text-center text-[11px] text-[#9a9a9a]">
          Secured connection · Powered by Link
        </footer>
      </div>
    </div>,
    document.body,
  );
}
