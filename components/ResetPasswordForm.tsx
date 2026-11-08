"use client";

import { Button } from "@/components/Button";
import { PasswordField } from "@/components/PasswordField";
import { PasswordRules } from "@/components/PasswordRules";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      setMessage(result.message);
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setFieldErrors(payload.fieldErrors ?? {});
      if (!payload.fieldErrors) {
        setError(payload.error || "Could not reset that password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        Account access
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink">Choose a new password</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Use the same rules as sign up. This link works once.
      </p>
      {message ? (
        <div className="mt-6 space-y-4">
          <p
            role="status"
            className="rounded-2xl border border-teal/30 bg-teal/8 px-4 py-3 text-sm text-ink"
          >
            {message}
          </p>
          <Button href="/login" size="lg" className="w-full">
            Log in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div>
            <PasswordField
              label="New password"
              id="reset-password"
              autoComplete="new-password"
              required
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordRules password={password} />
          </div>
          <PasswordField
            label="Confirm password"
            id="reset-confirm"
            autoComplete="new-password"
            required
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
            >
              {error}{" "}
              <Link href="/forgot-password" className="font-medium text-teal hover:underline">
                Request a new link
              </Link>
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
