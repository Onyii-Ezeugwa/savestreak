"use client";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/components/AuthProvider";
import type { ApiErrorPayload } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmError = searchParams.get("error") === "confirm";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    confirmError
      ? "That confirmation link is invalid or expired. Sign in after you confirm a newer email, or sign up again."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error || "Could not log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink">Log in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Confirm your email the first time, then use your $aveStreak password.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Field
          label="Email"
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Password"
          id="login-password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="mt-5 text-sm leading-6 text-muted">
        New to $aveStreak?{" "}
        <Link href="/signup" className="font-medium text-teal hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
