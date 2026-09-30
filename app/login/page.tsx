import { LoginForm } from "@/components/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <p className="text-sm text-muted">Loading the log in form...</p>
        }
      >
        <LoginForm />
      </Suspense>
    </section>
  );
}
