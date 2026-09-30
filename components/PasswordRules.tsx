import { cn } from "@/lib/cn";
import { PASSWORD_HINT, passwordScore } from "@/lib/password";

const STRENGTH = [
  { label: "Weak", bar: "bg-orange", text: "text-orange" },
  { label: "Fair", bar: "bg-gold", text: "text-gold" },
  { label: "Good", bar: "bg-green", text: "text-green" },
  { label: "Strong", bar: "bg-teal", text: "text-teal" },
] as const;

export function PasswordRules({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const score = passwordScore(password);
  const level = score > 0 ? STRENGTH[score - 1] : null;

  return (
    <div className={cn("mt-3", className)}>
      <div
        className="flex gap-1.5"
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={level?.label ?? "Empty"}
      >
        {STRENGTH.map((step, index) => (
          <span
            key={step.label}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-200",
              password && index < score ? level?.bar : "bg-line",
            )}
          />
        ))}
      </div>
      <p className="sr-only">{PASSWORD_HINT}</p>
      {level ? (
        <p className={cn("mt-2 text-xs font-medium", level.text)}>{level.label}</p>
      ) : null}
    </div>
  );
}
