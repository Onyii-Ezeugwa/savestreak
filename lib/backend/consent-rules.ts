import type { ConsentRecord, ConsentViewStatus } from "./types";

export const CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CONSENT_RESEND_LIMIT = 3;
export const CONSENT_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;

export function consentExpiresAt(createdAt: string, expiresAt?: string | null) {
  if (expiresAt) {
    return expiresAt;
  }
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) {
    return new Date(Date.now() + CONSENT_TTL_MS).toISOString();
  }
  return new Date(created + CONSENT_TTL_MS).toISOString();
}

export function consentDisplayStatus(
  consent: Pick<ConsentRecord, "decision" | "expiresAt">,
  now = new Date(),
): ConsentViewStatus {
  if (consent.decision !== "pending") {
    return consent.decision;
  }
  return new Date(consent.expiresAt).getTime() <= now.getTime()
    ? "expired"
    : "pending";
}

export function canResendConsent(status: ConsentViewStatus) {
  return status === "pending" || status === "expired";
}
