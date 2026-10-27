"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";

export function SaveLessonButton({
  lessonId,
  saved,
  onChange,
}: {
  lessonId: string;
  saved: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const [isSaved, setIsSaved] = useState(saved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsSaved(saved);
  }, [saved, lessonId]);

  async function toggle() {
    const next = !isSaved;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/save`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not save that lesson.");
      }
      setIsSaved(next);
      onChange?.(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that lesson.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={isSaved}
        disabled={pending}
        onClick={() => void toggle()}
        className={
          isSaved
            ? "inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/15 px-3 py-1.5 text-sm font-semibold text-ink"
            : "inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-semibold text-ink hover:border-gold/40"
        }
      >
        <Bookmark
          size={15}
          aria-hidden="true"
          fill={isSaved ? "currentColor" : "none"}
          className={isSaved ? "text-gold" : "text-muted"}
        />
        {pending ? "Saving..." : isSaved ? "Saved" : "Save lesson"}
      </button>
      {error ? <p className="text-xs text-orange">{error}</p> : null}
    </div>
  );
}
