import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl tracking-tight text-ink">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}
