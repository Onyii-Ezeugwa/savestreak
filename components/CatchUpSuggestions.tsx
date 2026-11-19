"use client";

import { Button } from "@/components/Button";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Suggestion {
  id: string;
  kind: "weekly" | "date" | "amount";
  title: string;
  detail: string;
  effect: string;
}

interface SuggestionPayload {
  suggestions: Suggestion[];
  accepted: Suggestion | null;
  spending: { total: number; topLabel: string | null } | null;
  source: "ai" | "fallback" | null;
}

export function CatchUpSuggestions({
  goalId,
  onChanged,
}: {
  goalId: string;
  onChanged: () => Promise<void>;
}) {
  const [payload, setPayload] = useState<SuggestionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const next = await apiRequest<SuggestionPayload>(`/goals/${goalId}/suggestions`, {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
      setPayload(next);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, [goalId]);

  async function choose(action: "accept" | "dismiss", suggestionId: string) {
    setBusyId(suggestionId);
    setError(null);
    try {
      await apiRequest(`/goals/${goalId}/suggestions`, {
        method: "POST",
        body: JSON.stringify({ action, suggestionId }),
      });
      if (action === "accept") {
        const chosen = payload?.suggestions.find((item) => item.id === suggestionId) ?? null;
        await onChanged();
        setPayload((current) => ({
          suggestions: [],
          accepted: chosen,
          spending: current?.spending ?? null,
          source: null,
        }));
      } else {
        setPayload((current) =>
          current
            ? {
                ...current,
                suggestions: current.suggestions.filter((item) => item.id !== suggestionId),
              }
            : current,
        );
      }
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setBusyId(null);
    }
  }

  const spending = payload?.spending;
  const spendLine =
    spending && spending.total > 0
      ? `Recent spending is $${Math.round(spending.total)}${spending.topLabel ? `, mostly ${spending.topLabel}` : ""}.`
      : "No spending was recorded in the last 30 days, so these use your savings pace.";

  return (
    <section className="game-panel rounded-3xl px-6 py-4 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Catch up</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Hide suggestions" : "View suggestions"}
        </Button>
      </div>
      {open ? (
        <div className="mt-4 space-y-3">
          {payload ? (
            <p className="text-sm leading-6 text-muted">
              {spendLine} Nothing changes until you accept a suggestion.
            </p>
          ) : null}
          {loading ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-teal" role="status">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Looking at your pace and spending
            </p>
          ) : null}
          {error ? <p className="text-sm text-orange">{error}</p> : null}
          {payload?.source === "fallback" ? (
            <p className="text-sm text-muted">
              The writing assistant was unavailable, so these options are calculated
              from your goal and spending.
            </p>
          ) : null}
          {payload && payload.suggestions.length > 0 ? (
            <ul className="space-y-3">
              {payload.suggestions.map((suggestion) => (
                <li key={suggestion.id} className="rounded-2xl border border-line bg-card px-4 py-3">
                  <p className="font-semibold text-ink">{suggestion.title}</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{suggestion.effect}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busyId !== null}
                      onClick={() => void choose("accept", suggestion.id)}
                    >
                      {busyId === suggestion.id ? "Saving..." : "Accept"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId !== null}
                      onClick={() => void choose("dismiss", suggestion.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {payload && payload.suggestions.length === 0 && !loading ? (
            <div>
              {payload.accepted ? (
                <p className="text-sm text-ink">{payload.accepted.effect}</p>
              ) : (
                <p className="text-sm text-muted">Suggestions are hidden for this goal.</p>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={loading}
                onClick={() => void load(true)}
              >
                Look again
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
