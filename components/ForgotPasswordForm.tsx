"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error || "Could not send a reset link.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        Account access
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink">Forgot password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Enter the email on your $aveStreak account. If it is registered, we will
        send a reset link that expires in 30 minutes.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Field
          label="Email"
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {message ? (
          <p
            role="status"
            className="rounded-2xl border border-teal/30 bg-teal/8 px-4 py-3 text-sm text-ink"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <p className="mt-5 text-sm leading-6 text-muted">
        <Link href="/login" className="font-medium text-teal hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
