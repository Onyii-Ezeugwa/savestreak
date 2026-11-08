import { cn } from "@/lib/cn";
import Link from "next/link";

function initials(firstName: string, lastName: string) {
  const letters = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  return letters || "?";
}

export function UserAvatar({
  firstName,
  lastName,
  href,
  size = "sm",
  className,
}: {
  firstName: string;
  lastName: string;
  href?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const classes = cn(
    "inline-grid shrink-0 place-items-center rounded-full bg-teal font-semibold text-white shadow-[inset_0_-2px_0_rgba(15,95,98,0.35)]",
    size === "lg" ? "h-24 w-24 text-3xl" : "h-9 w-9 text-sm",
    className,
  );
  const mark = initials(firstName, lastName);

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${firstName} ${lastName}, open profile`}
        className={cn(
          classes,
          "ring-2 ring-card transition hover:ring-teal/50 focus-visible:ring-teal",
        )}
      >
        {mark}
      </Link>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      {mark}
    </span>
  );
}
