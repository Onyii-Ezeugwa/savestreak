"use client";

import { BirthDatePicker } from "@/components/BirthDatePicker";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { PasswordField } from "@/components/PasswordField";
import { PasswordRules } from "@/components/PasswordRules";
import { SchoolPicker } from "@/components/SchoolPicker";
import { useAuth } from "@/components/AuthProvider";
import type { ApiErrorPayload } from "@/lib/api";
import type { SchoolOption } from "@/lib/school-option";
import { ageFromDob, parseDateOnly } from "@/lib/dates";
import { passwordError } from "@/lib/password";
import { formatPhone } from "@/lib/profile";
import { US_STATES } from "@/lib/us-states";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type SignupStep = "account" | "onboarding" | "done";

const ACCOUNT_ERROR_KEYS = [
  "firstName",
  "lastName",
  "email",
  "password",
  "confirmPassword",
  "dateOfBirth",
  "guardianEmail",
];

export function SignupFlow() {
  const { register } = useAuth();
  const [step, setStep] = useState<SignupStep>("account");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [school, setSchool] = useState<SchoolOption | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [consentEmailSent, setConsentEmailSent] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const dob = parseDateOnly(dateOfBirth);
  const under18 = Boolean(dob && ageFromDob(dob) < 18);

  function onAccountContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const nextErrors: Record<string, string> = {};
    if (!firstName.trim()) {
      nextErrors.firstName = "Enter your first name.";
    }
    if (!lastName.trim()) {
      nextErrors.lastName = "Enter your last name.";
    }
    if (!email.trim()) {
      nextErrors.email = "Enter a valid email address.";
    }
    const passwordIssue = passwordError(password);
    if (passwordIssue) {
      nextErrors.password = passwordIssue;
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!dob) {
      nextErrors.dateOfBirth = "Enter a valid date of birth.";
    }
    if (under18 && !guardianEmail.trim()) {
      nextErrors.guardianEmail =
        "Enter a valid parent or guardian email address.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setStep("onboarding");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await register({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        dateOfBirth,
        guardianEmail: under18 ? guardianEmail : undefined,
        phone,
        streetAddress,
        city,
        state,
        postalCode,
        schoolId: school?.id,
        schoolName: school?.name,
        schoolCity: school?.city,
        schoolState: school?.state,
        schoolKind: school?.kind,
      });
      setConsentEmailSent(Boolean(result.consentEmailSent));
      setNeedsEmailConfirmation(Boolean(result.needsEmailConfirmation));
      setStep("done");
    } catch (caught) {
      const payload = caught as ApiErrorPayload;
      setError(payload.error || "Could not create the account.");
      const nextErrors = payload.fieldErrors ?? {};
      setFieldErrors(nextErrors);
      const accountError = ACCOUNT_ERROR_KEYS.some((key) => nextErrors[key]);
      setStep(accountError ? "account" : "onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
          Account created
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink">
          {needsEmailConfirmation
            ? "Confirm your email"
            : under18
              ? "Ask a parent or guardian to approve"
              : "You are in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {needsEmailConfirmation
            ? `We sent a confirmation link to ${email}. Open that email before you log in.`
            : under18
              ? "Because you are under 18, this account stays limited until a parent or guardian approves the consent request."
              : "Your account is active. You can create a savings goal on your dashboard."}
        </p>
        {under18 ? (
          <div className="mt-5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-6 text-ink">
            <p className="font-semibold">
              {consentEmailSent
                ? `We emailed ${guardianEmail}`
                : "The approval email did not send"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {consentEmailSent
                ? "A parent or guardian has to open that email to approve or decline. You cannot do that from this page."
                : "Sign up again with the same details so we can resend the approval email to a parent or guardian."}
            </p>
          </div>
        ) : null}
        <div className="mt-6">
          <Button href={needsEmailConfirmation || under18 ? "/login" : "/dashboard"}>
            {needsEmailConfirmation || under18 ? "Go to log in" : "Go to dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
        {step === "account" ? "Create account" : "Onboarding"}
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink">
        {step === "account" ? "Sign up" : "Tell us about you"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {step === "account"
          ? "We use your date of birth to open the features that match your age group. Students under 18 need parent or guardian consent."
          : "Add your contact details and school so we can keep your account student-ready."}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Step {step === "account" ? "1" : "2"} of 2
      </p>

      {step === "account" ? (
        <form onSubmit={onAccountContinue} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              id="first-name"
              autoComplete="given-name"
              required
              value={firstName}
              error={fieldErrors.firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <Field
              label="Last name"
              id="last-name"
              autoComplete="family-name"
              required
              value={lastName}
              error={fieldErrors.lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <Field
            label="Email"
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div>
            <PasswordField
              label="Password"
              id="signup-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              error={fieldErrors.password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="mt-5">
              <PasswordField
                label="Confirm password"
                id="confirm-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                error={fieldErrors.confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <PasswordRules password={password} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Date of birth</p>
            <div className="mt-2">
              <BirthDatePicker
                id="date-of-birth"
                value={dateOfBirth}
                onChange={setDateOfBirth}
                error={fieldErrors.dateOfBirth}
              />
            </div>
            {fieldErrors.dateOfBirth ? (
              <p className="mt-2 text-sm text-orange">{fieldErrors.dateOfBirth}</p>
            ) : (
              <p className="mt-2 text-xs text-muted">You must be at least 13.</p>
            )}
          </div>
          {under18 ? (
            <div className="space-y-4 rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
                <ShieldCheck size={14} aria-hidden="true" />
                Parent or guardian consent required
              </p>
              <Field
                label="Parent or guardian email"
                id="guardian-email"
                type="email"
                required
                value={guardianEmail}
                error={fieldErrors.guardianEmail}
                onChange={(event) => setGuardianEmail(event.target.value)}
              />
            </div>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <Field
            label="Street address"
            id="street-address"
            autoComplete="street-address"
            required
            value={streetAddress}
            error={fieldErrors.streetAddress}
            onChange={(event) => setStreetAddress(event.target.value)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="City"
              id="city"
              autoComplete="address-level2"
              required
              value={city}
              error={fieldErrors.city}
              onChange={(event) => setCity(event.target.value)}
            />
            <SelectField
              label="State"
              id="state"
              required
              value={state}
              error={fieldErrors.state}
              onChange={(event) => setState(event.target.value)}
            >
              <option value="">Select</option>
              {US_STATES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          </div>
          <Field
            label="ZIP code"
            id="postal-code"
            autoComplete="postal-code"
            inputMode="numeric"
            required
            value={postalCode}
            error={fieldErrors.postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
          <Field
            label="Phone number"
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            error={fieldErrors.phone}
            hint="US number, 10 digits."
            onChange={(event) => setPhone(formatPhone(event.target.value))}
          />
          <SchoolPicker
            value={school}
            onChange={setSchool}
            error={fieldErrors.school}
          />
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-orange/30 bg-orange/8 px-4 py-3 text-sm text-ink"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setStep("account")}
            >
              Back
            </Button>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>
      )}
      <p className="mt-5 text-sm leading-6 text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-teal hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
