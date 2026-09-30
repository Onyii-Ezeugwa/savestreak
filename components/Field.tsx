import { cn } from "@/lib/cn";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function Field({
  label,
  error,
  hint,
  className,
  id,
  ...inputProps
}: FieldProps) {
  const fieldId = id ?? inputProps.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "mt-2 w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-ink placeholder:text-muted/80",
          error ? "border-orange" : "border-line",
          className,
        )}
        {...inputProps}
      />
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-orange">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...selectProps
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? selectProps.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "mt-2 w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-ink",
          error ? "border-orange" : "border-line",
          className,
        )}
        {...selectProps}
      >
        {children}
      </select>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-orange">
          {error}
        </p>
      ) : null}
    </div>
  );
}
