"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { useAuth } from "@/components/AuthProvider";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { useEffect, useState, type FormEvent } from "react";

interface ConsentStatus {
  required: boolean;
  status?: "pending" | "approved" | "declined" | "expired";
  guardianEmail?: string;
  sentAt?: string;
  expiresAt?: string;
  canResend?: boolean;
  resendsRemaining?: number;
  emailSent?: boolean;
  message?: string;
}

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  expired: "Expired",
} as const;

const STATUS_CHIP = {
  pending: "bg-gold/15 text-ink",
  approved: "bg-green/15 text-ink",
  declined: "bg-berry/10 text-berry",
  expired: "bg-orange/10 text-orange",
} as const;

export function ConsentStatusPanel() {
  const { refresh } = useAuth();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const payload = await apiRequest<ConsentStatus>("/consent/status");
        if (!active) {
          return;
        }
        setStatus(payload);
        setEmail((current) => current || payload.guardianEmail || "");
        if (payload.status === "approved" || payload.status === "declined") {
          await refresh();
        }
      } catch (caught) {
        if (active) {
          setError((caught as ApiErrorPayload).error);
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);
    try {
      const payload = await apiRequest<ConsentStatus>("/consent/resend", {
        method: "POST",
        body: JSON.stringify({ guardianEmail: email }),
      });
      setStatus(payload);
      setMessage(payload.message ?? null);
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error);
      setFieldErrors(payload.fieldErrors ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  if (!status) {
    return <p className="text-sm text-muted">Loading consent status...</p>;
  }

  if (!status.required || !status.status) {
    return null;
  }

  const label = STATUS_LABEL[status.status];

  return (
    <section className="game-panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Guardian consent</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${STATUS_CHIP[status.status]}`}>
          {label}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Sent to
          </dt>
          <dd className="mt-1 text-sm text-ink">{status.guardianEmail}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Date sent
          </dt>
          <dd className="mt-1 text-sm text-ink">
            {status.sentAt ? new Date(status.sentAt).toLocaleString() : "Not recorded"}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 text-muted">
        {status.status === "approved"
          ? "A parent or guardian approved this account."
          : status.status === "declined"
            ? "A parent or guardian declined this account, so bank, receipts, goals, lessons, and summaries stay locked."
            : status.status === "expired"
              ? "The last consent link expired. Send a new one to unlock the account."
              : "This page updates when a parent or guardian responds. Bank, receipts, goals, lessons, and summaries stay locked until then."}
      </p>
      {status.canResend ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 border-t border-line pt-6">
          <Field
            label="Parent or guardian email"
            type="email"
            value={email}
            error={fieldErrors.guardianEmail}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="text-xs text-muted">
            {status.resendsRemaining ?? 0} resend
            {(status.resendsRemaining ?? 0) === 1 ? "" : "s"} left today. A new
            email replaces the previous link.
          </p>
          {message ? <p className="text-sm text-teal">{message}</p> : null}
          {error ? <p className="text-sm text-orange">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Resend consent request"}
          </Button>
        </form>
      ) : error ? (
        <p className="mt-4 text-sm text-orange">{error}</p>
      ) : null}
    </section>
  );
}
