import { Button } from "@/components/Button";
import Link from "next/link";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-line bg-card p-6 shadow-[0_10px_30px_rgba(35,31,27,0.05)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
          Welcome back
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink">Log in</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Authentication is coming in the next development task. This page is
          a placeholder so the landing page CTAs have a clear destination.
        </p>
        <form className="mt-6 space-y-5">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-ink"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="mt-2 w-full rounded-2xl border border-line bg-cream px-4 py-3 text-sm"
            />
          </div>
          <Button type="button" size="lg" className="w-full" disabled>
            Log in coming soon
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted">
          New to $aveStreak?{" "}
          <Link href="/signup" className="font-medium text-teal hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </section>
  );
}
