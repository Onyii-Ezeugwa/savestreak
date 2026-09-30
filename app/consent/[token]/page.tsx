"use client";

import { Button } from "@/components/Button";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ConsentView {
  studentFirstName: string;
  guardianEmail: string;
  decision: "pending" | "approved" | "declined";
  decidedAt: string | null;
}

export default function ConsentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [consent, setConsent] = useState<ConsentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approved" | "declined" | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<ConsentView>(`/consent/${token}`)
      .then((payload) => {
        if (active) {
          setConsent(payload);
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
  }, [token]);

  async function decide(decision: "approved" | "declined") {
    setBusy(decision);
    setError(null);
    try {
      const payload = await apiRequest<ConsentView>(`/consent/${token}`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      setConsent(payload);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
          <ShieldCheck size={14} aria-hidden="true" />
          Parent or guardian consent
        </p>
        {error && !consent ? (
          <p className="mt-6 text-sm leading-6 text-orange">{error}</p>
        ) : null}
        {consent ? (
          <>
            <h1 className="mt-3 font-display text-3xl text-ink">
              {consent.decision === "pending"
                ? `Approve ${consent.studentFirstName}'s $aveStreak account?`
                : consent.decision === "approved"
                  ? "Consent approved"
                  : "Consent declined"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {consent.decision === "pending"
                ? `${consent.studentFirstName} asked you to decide whether they can use $aveStreak. Approving activates their account. Declining keeps it restricted.`
                : `This request was ${consent.decision} and the decision is on file.`}
            </p>
            {error ? (
              <p className="mt-4 text-sm text-orange">{error}</p>
            ) : null}
            {consent.decision === "pending" ? (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  disabled={busy !== null}
                  onClick={() => void decide("approved")}
                >
                  {busy === "approved" ? "Saving..." : "Approve"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={busy !== null}
                  onClick={() => void decide("declined")}
                >
                  {busy === "declined" ? "Saving..." : "Decline"}
                </Button>
              </div>
            ) : (
              <div className="mt-6">
                <Button href="/">Back to $aveStreak</Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
