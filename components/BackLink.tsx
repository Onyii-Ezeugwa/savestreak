import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({
  href = "/dashboard",
  label = "Back to dashboard",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-card text-ink shadow-[0_6px_16px_rgba(35,31,27,0.06)] transition duration-200 hover:-translate-x-0.5 hover:border-teal/40 hover:text-teal"
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </Link>
  );
}
