"use client";

import { Button } from "@/components/Button";
import type { AgeGroup } from "@/lib/types";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

type SignupStep = "age" | "adult" | "minor" | "done";

export function SignupFlow() {
  const [step, setStep] = useState<SignupStep>("age");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  function chooseAge(group: Exclude<AgeGroup, null>) {
    setAgeGroup(group);
    setStep(group === "adult" ? "adult" : "minor");
  }

  function finishSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("done");
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
      {step === "age" ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            Age check
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">
            First, tell us your age group
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            $aveStreak supports students 18+ and students under 18. This helps
            us follow the right account steps.
          </p>
          <div className="mt-6 grid gap-3">
            <Button
              size="lg"
              className="w-full"
              onClick={() => chooseAge("adult")}
            >
              I am 18 or older
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => chooseAge("minor")}
            >
              I am under 18
            </Button>
          </div>
        </div>
      ) : null}

      {step === "adult" ? (
        <form onSubmit={finishSignup} className="space-y-5">
          <button
            type="button"
            onClick={() => setStep("age")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <h1 className="font-display text-3xl text-ink">Create your account</h1>
          <p className="text-sm leading-6 text-muted">
            Account creation is coming next. This preview collects the basics
            so the sign-up flow is ready.
          </p>
          <div>
            <label htmlFor="first-name" className="text-sm font-medium text-ink">
              First name
            </label>
            <input
              id="first-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continue
          </Button>
        </form>
      ) : null}

      {step === "minor" ? (
        <form onSubmit={finishSignup} className="space-y-5">
          <button
            type="button"
            onClick={() => setStep("age")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-ink">
            <ShieldCheck size={14} aria-hidden="true" />
            Parent or guardian consent required
          </div>
          <h1 className="font-display text-3xl text-ink">
            A parent or guardian needs to approve your account
          </h1>
          <p className="text-sm leading-6 text-muted">
            Because you are under 18, a parent or guardian must review and
            consent before your $aveStreak account can be fully activated. You
            can still try the AI Goal Planner without an account.
          </p>
          <ol className="space-y-2 text-sm leading-6 text-ink">
            <li>1. A parent or guardian confirms their email.</li>
            <li>2. They review how $aveStreak works.</li>
            <li>3. Your account is activated after they consent.</li>
          </ol>
          <div>
            <label
              htmlFor="guardian-email"
              className="text-sm font-medium text-ink"
            >
              Parent or guardian email
            </label>
            <input
              id="guardian-email"
              type="email"
              required
              value={guardianEmail}
              onChange={(event) => setGuardianEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Continue with parent or guardian
          </Button>
        </form>
      ) : null}

      {step === "done" ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            Next step
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink">
            Authentication is coming soon
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {ageGroup === "minor"
              ? "Parent or guardian consent will be required before this account can be fully activated. You can keep using the Goal Planner in the meantime."
              : "Your sign-up details are ready for the next development task. Full account creation has not been connected yet."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/">Back to home</Button>
            <Button href="/#goal-planner" variant="outline">
              Try Goal Planner
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
