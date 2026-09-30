"use client";

import type { SchoolOption } from "@/lib/school-option";
import { cn } from "@/lib/cn";
import { useEffect, useId, useState } from "react";

interface SchoolPickerProps {
  value: SchoolOption | null;
  onChange: (school: SchoolOption | null) => void;
  error?: string;
}

export function SchoolPicker({ value, onChange, error }: SchoolPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      void fetch(`/api/schools?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((payload: { schools?: SchoolOption[] }) => {
          setResults(payload.schools ?? []);
          setOpen(true);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") {
            return;
          }
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="relative">
      <label htmlFor="school-search" className="text-sm font-medium text-ink">
        School
      </label>
      {value ? (
        <div className="mt-2 flex items-start justify-between gap-3 rounded-2xl border border-teal/40 bg-cream px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">{value.name}</p>
            <p className="mt-1 text-xs text-muted">
              {[value.city, value.state].filter(Boolean).join(", ")} ·{" "}
              {value.kind === "college" ? "College" : "K-12"}
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-medium text-teal hover:underline"
            onClick={() => {
              onChange(null);
              setQuery("");
              setResults([]);
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <input
          id="school-search"
          value={query}
          autoComplete="off"
          placeholder="Search US public K-12 schools and colleges"
          aria-invalid={Boolean(error)}
          aria-expanded={open}
          aria-controls={listId}
          className={cn(
            "mt-2 w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-ink placeholder:text-muted/80",
            error ? "border-orange" : "border-line",
          )}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setOpen(true);
            }
          }}
        />
      )}
      {loading ? (
        <p className="mt-2 text-xs text-muted">Searching schools...</p>
      ) : null}
      {!value && open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-line bg-card p-2 shadow-[0_12px_32px_rgba(35,31,27,0.1)]"
        >
          {results.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-cream"
                onClick={() => {
                  onChange(school);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium text-ink">{school.name}</span>
                <span className="text-xs text-muted">
                  {[school.city, school.state].filter(Boolean).join(", ")} ·{" "}
                  {school.kind === "college" ? "College" : "K-12"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-2 text-sm text-orange">{error}</p> : null}
      {!value && !error ? (
        <p className="mt-2 text-xs text-muted">
          Type at least 3 letters, then pick your school from the list.
        </p>
      ) : null}
    </div>
  );
}
