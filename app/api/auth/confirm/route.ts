import { createServerSupabase } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const rawType = String(form.get("type") ?? "signup");
  const type = OTP_TYPES.has(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;

  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin), 303);
    response.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    return response;
  };

  if (!tokenHash || !type) {
    return redirect("/login?error=confirm");
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) {
    return redirect("/login?error=confirm");
  }

  return redirect("/dashboard");
}
