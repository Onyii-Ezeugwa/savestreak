import { Resend } from "resend";
import { ConsentRequestEmail } from "@/emails/consent-request";
import { appUrl } from "./types";

const DEFAULT_FROM = '"$aveStreak" <hello@mail.savestreak.org>';

function consentFromAddress() {
  const configured = process.env.RESEND_FROM_EMAIL?.trim().replace(
    /^["']|["']$/g,
    "",
  );
  const valid =
    configured &&
    /^(?:[^<>]+ <[^<>@\s]+@[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+)$/.test(configured);
  return valid ? configured : DEFAULT_FROM;
}

export async function sendConsentEmail(input: {
  consentId: string;
  guardianEmail: string;
  studentFirstName: string;
  consentUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[consent] RESEND_API_KEY is missing. Skipped email send.");
    return false;
  }

  const from = consentFromAddress();

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send(
      {
        from,
        to: [input.guardianEmail],
        subject: `Approve ${input.studentFirstName}'s $aveStreak account`,
        react: ConsentRequestEmail({
          studentFirstName: input.studentFirstName,
          consentUrl: input.consentUrl,
          appUrl: appUrl(),
        }),
      },
      { idempotencyKey: `consent-email/v2/${input.consentId}` },
    );

    if (error) {
      console.error("[consent] Failed to send email:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "[consent] Failed to send email:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return false;
  }
}
