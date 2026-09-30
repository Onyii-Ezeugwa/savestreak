import type { DataStore } from "./store";
import { ApiError, type PublicConsent } from "./types";

export class ConsentService {
  constructor(private readonly store: DataStore) {}

  async get(token: string): Promise<PublicConsent> {
    const consent = await this.store.getConsentByToken(token);
    if (!consent) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }
    const user = await this.store.getUserById(consent.userId);
    if (!user) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }
    return {
      studentFirstName: user.firstName,
      guardianEmail: consent.guardianEmail,
      decision: consent.decision,
      decidedAt: consent.decidedAt,
    };
  }

  async decide(token: string, decision: unknown) {
    if (decision !== "approved" && decision !== "declined") {
      throw new ApiError(400, "Choose approve or decline.");
    }

    const consent = await this.store.getConsentByToken(token);
    if (!consent) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }
    if (consent.decision !== "pending") {
      throw new ApiError(409, "This request already has a recorded decision.");
    }

    const user = await this.store.getUserById(consent.userId);
    if (!user) {
      throw new ApiError(404, "This consent link is invalid or has expired.");
    }

    const decidedAt = new Date().toISOString();
    await this.store.updateConsent({
      ...consent,
      decision,
      decidedAt,
    });
    await this.store.updateUser({
      ...user,
      status: decision === "approved" ? "active" : "restricted",
    });

    return this.get(token);
  }
}
