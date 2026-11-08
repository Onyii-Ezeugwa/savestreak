import { randomBytes, randomUUID } from "node:crypto";
import {
  canResendConsent,
  CONSENT_RESEND_LIMIT,
  CONSENT_RESEND_WINDOW_MS,
  CONSENT_TTL_MS,
  consentDisplayStatus,
} from "./consent-rules";
import { sendConsentEmail } from "./mail";
import type { DataStore } from "./store";
import {
  ApiError,
  appUrl,
  type ConsentRecord,
  type PublicConsent,
  type UserRecord,
} from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublic(consent: ConsentRecord, studentFirstName: string): PublicConsent {
  return {
    studentFirstName,
    guardianEmail: consent.guardianEmail,
    decision: consentDisplayStatus(consent),
    decidedAt: consent.decidedAt,
  };
}

export class ConsentService {
  constructor(private readonly store: DataStore) {}

  async get(token: string): Promise<PublicConsent> {
    const consent = await this.loadByToken(token);
    const user = await this.loadStudent(consent.userId);
    return toPublic(consent, user.firstName);
  }

  async decide(token: string, decision: unknown) {
    if (decision !== "approved" && decision !== "declined") {
      throw new ApiError(400, "Choose approve or decline.");
    }

    const consent = await this.loadByToken(token);
    const status = consentDisplayStatus(consent);
    if (status === "expired") {
      throw new ApiError(
        410,
        "This consent link expired. Ask the student to send a new one.",
      );
    }
    if (consent.decision !== "pending") {
      throw new ApiError(409, "This request already has a recorded decision.");
    }

    const user = await this.loadStudent(consent.userId);
    const decidedAt = new Date().toISOString();
    const updated = await this.store.updateConsent({
      ...consent,
      decision,
      decidedAt,
    });
    await this.store.updateUser({
      ...user,
      status: decision === "approved" ? "active" : "restricted",
    });
    return toPublic(updated, user.firstName);
  }

  async status(user: UserRecord) {
    if (user.ageGroup !== "minor") {
      return { required: false as const };
    }
    const consent = await this.store.getConsentByUserId(user.id);
    if (!consent) {
      throw new ApiError(404, "No consent request is on file.");
    }
    const view = consentDisplayStatus(consent);
    const since = new Date(Date.now() - CONSENT_RESEND_WINDOW_MS).toISOString();
    const used = await this.store.countConsentResends(user.id, since);
    return {
      required: true as const,
      status: view,
      guardianEmail: consent.guardianEmail,
      sentAt: consent.sentAt,
      expiresAt: consent.expiresAt,
      canResend: canResendConsent(view),
      resendsRemaining: Math.max(0, CONSENT_RESEND_LIMIT - used),
    };
  }

  async resend(user: UserRecord, guardianEmailInput: unknown) {
    if (user.ageGroup !== "minor") {
      throw new ApiError(400, "This account does not need guardian consent.");
    }
    const consent = await this.store.getConsentByUserId(user.id);
    if (!consent) {
      throw new ApiError(404, "No consent request is on file.");
    }
    const view = consentDisplayStatus(consent);
    if (!canResendConsent(view)) {
      throw new ApiError(409, "This request already has a recorded decision.");
    }

    const guardianEmail =
      typeof guardianEmailInput === "string"
        ? guardianEmailInput.trim().toLowerCase()
        : consent.guardianEmail;
    if (!EMAIL_PATTERN.test(guardianEmail)) {
      throw new ApiError(400, "Enter a valid parent or guardian email address.", {
        guardianEmail: "Enter a valid parent or guardian email address.",
      });
    }
    if (guardianEmail === user.email) {
      throw new ApiError(400, "Use a parent or guardian email, not your own.", {
        guardianEmail: "Use a parent or guardian email, not your own.",
      });
    }

    const since = new Date(Date.now() - CONSENT_RESEND_WINDOW_MS).toISOString();
    const used = await this.store.countConsentResends(user.id, since);
    if (used >= CONSENT_RESEND_LIMIT) {
      throw new ApiError(
        429,
        "You can resend 3 consent emails per day. Try again tomorrow.",
      );
    }

    const sentAt = new Date().toISOString();
    const updated = await this.store.updateConsent({
      ...consent,
      guardianEmail,
      token: randomBytes(24).toString("hex"),
      sentAt,
      expiresAt: new Date(Date.now() + CONSENT_TTL_MS).toISOString(),
    });
    await this.store.createConsentResend({
      id: randomUUID(),
      userId: user.id,
      consentId: updated.id,
      guardianEmail,
      sentAt,
    });
    const emailSent = await sendConsentEmail({
      consentId: updated.id,
      guardianEmail,
      studentFirstName: user.firstName,
      consentUrl: `${appUrl()}/consent/${updated.token}`,
      idempotencyKey: `consent-email/v2/${updated.id}/${sentAt}`,
    });

    return {
      ...(await this.status(user)),
      emailSent,
      message: emailSent
        ? "A new consent email is on the way. The previous link no longer works."
        : "The previous link no longer works, but the email could not be sent. Try again.",
    };
  }

  private async loadByToken(token: string) {
    const consent = await this.store.getConsentByToken(token);
    if (!consent) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }
    return consent;
  }

  private async loadStudent(userId: string) {
    const user = await this.store.getUserById(userId);
    if (!user) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }
    return user;
  }
}
