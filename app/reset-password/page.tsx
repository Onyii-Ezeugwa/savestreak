import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordScreen({ token }: { token: string }) {
  if (!token) {
    return (
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 sm:p-8">
        <h1 className="font-display text-3xl text-ink">Reset link missing</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Open the link from your email, or request a new one.
        </p>
        <p className="mt-5 text-sm">
          <Link href="/forgot-password" className="font-medium text-teal hover:underline">
            Forgot password
          </Link>
        </p>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <Suspense fallback={<p className="text-sm text-muted">Loading the reset form...</p>}>
        <ResetPasswordScreen token={token} />
      </Suspense>
    </section>
  );
}
