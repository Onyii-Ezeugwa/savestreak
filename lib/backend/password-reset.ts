import { createHash, randomBytes, randomUUID } from "node:crypto";
import { passwordError } from "@/lib/password";
import { signOutAuthSessions, updateAuthPassword } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "./mail";
import type { DataStore } from "./store";
import { ApiError, appUrl } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TTL_MS = 30 * 60 * 1000;

export const PASSWORD_RESET_SENT =
  "If that email is registered, we sent a reset link. It expires in 30 minutes.";

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function resetLinkError(status: "missing" | "used" | "expired") {
  if (status === "used") {
    return "That reset link was already used. Request a new one.";
  }
  if (status === "expired") {
    return "That reset link expired. Request a new one.";
  }
  return "That reset link is invalid. Request a new one.";
}

export async function requestPasswordReset(
  store: DataStore,
  emailInput: unknown,
  send: (input: {
    resetId: string;
    email: string;
    resetUrl: string;
  }) => Promise<boolean> = sendPasswordResetEmail,
) {
  const email =
    typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "Enter a valid email address.", {
      email: "Enter a valid email address.",
    });
  }

  const user = await store.getUserByEmail(email);
  if (!user) {
    return { message: PASSWORD_RESET_SENT };
  }

  await store.invalidateOpenPasswordResets(user.id);
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const reset = {
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TTL_MS).toISOString(),
    usedAt: null,
    createdAt: now.toISOString(),
  };
  await store.createPasswordReset(reset);
  await send({
    resetId: reset.id,
    email: user.email,
    resetUrl: `${appUrl()}/reset-password?token=${token}`,
  });
  return { message: PASSWORD_RESET_SENT };
}

export async function confirmPasswordReset(
  store: DataStore,
  input: { token?: unknown; password?: unknown; confirmPassword?: unknown },
  deps: {
    updatePassword?: (userId: string, password: string) => Promise<void>;
    signOut?: (userId: string) => Promise<void>;
  } = {},
) {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const confirmPassword =
    typeof input.confirmPassword === "string" ? input.confirmPassword : "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    throw new ApiError(400, resetLinkError("missing"));
  }

  const passwordIssue = passwordError(password);
  const fieldErrors: Record<string, string> = {};
  if (passwordIssue) {
    fieldErrors.password = passwordIssue;
  }
  if (confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError(400, "Check the highlighted fields.", fieldErrors);
  }

  const claimed = await store.claimPasswordReset(
    hashResetToken(token),
    new Date().toISOString(),
  );
  if (claimed.status !== "ok") {
    throw new ApiError(400, resetLinkError(claimed.status));
  }

  const updatePassword = deps.updatePassword ?? updateAuthPassword;
  const signOut = deps.signOut ?? signOutAuthSessions;
  try {
    await updatePassword(claimed.reset.userId, password);
  } catch (error) {
    await store.releasePasswordReset(claimed.reset.id);
    throw error;
  }

  let sessionsSignedOut = true;
  try {
    await signOut(claimed.reset.userId);
  } catch (error) {
    sessionsSignedOut = false;
    console.error(
      "[password-reset] Could not sign out existing sessions.",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return {
    message: sessionsSignedOut
      ? "Your password is updated. Log in with the new password. Other sessions were signed out."
      : "Your password is updated. Log in with the new password.",
  };
}
