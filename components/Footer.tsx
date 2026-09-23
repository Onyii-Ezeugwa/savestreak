import { Logo } from "@/components/Logo";
import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#financial-learning", label: "Financial Learning" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream-dark/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="max-w-md">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted">
            A gamified savings coach for students. Set goals, keep streaks, and
            learn money habits that actually stick.
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Explore
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink/80 transition-colors hover:text-teal"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-line/80">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm text-muted sm:px-6 lg:px-8">
          Built to help students build better money habits.
        </p>
      </div>
    </footer>
  );
}
