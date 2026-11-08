"use client";

import { useAuth } from "@/components/AuthProvider";
import { LessonArticle } from "@/components/LessonArticle";
import { SaveLessonButton } from "@/components/SaveLessonButton";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface LessonView {
  id: string;
  title: string;
  body: string;
  takeaway: string;
  minutes: number;
  youtubeUrl: string;
  youtubeLabel: string;
  topics?: string[];
  saved?: boolean;
}

export default function LessonsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [earlier, setEarlier] = useState<LessonView[]>([]);
  const [savedLessons, setSavedLessons] = useState<LessonView[]>([]);
  const [lessonSaved, setLessonSaved] = useState(false);
  const savedScroller = useRef<HTMLUListElement>(null);
  const [earned, setEarned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(true);
  const scroller = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status !== "active") {
      return;
    }
    let cancelled = false;
    async function load() {
      setWriting(true);
      setError(null);
      try {
        const response = await fetch("/api/lessons", { credentials: "include" });
        const payload = (await response.json()) as {
          lessons?: LessonView[];
          earlier?: LessonView[];
          saved?: LessonView[];
          error?: string;
        };
        if (!response.ok || !payload.lessons?.[0]) {
          throw new Error(payload.error || "Could not write a lesson right now.");
        }
        const next = payload.lessons[0];
        if (cancelled) {
          return;
        }
        setLesson(next);
        setLessonSaved(Boolean(next.saved));
        setEarlier(payload.earlier ?? []);
        setSavedLessons(payload.saved ?? []);
        const readResponse = await fetch(`/api/lessons/${next.id}`, {
          method: "POST",
          credentials: "include",
        });
        if (readResponse.ok && !cancelled) {
          const readPayload = (await readResponse.json()) as {
            justEarned?: Array<{ name: string }>;
          };
          setEarned((readPayload.justEarned ?? []).map((badge) => badge.name));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not write a lesson right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setWriting(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="page-enter mx-auto max-w-5xl px-5 py-14 sm:px-6">
      <div className="flex items-start gap-4">
        <BackLink />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Financial learning
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Your lesson</h1>
        </div>
      </div>

      {writing ? (
        <div
          className="mt-8 rounded-3xl border border-teal/25 bg-teal/5 px-6 py-8"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Preparing your lesson
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Looking at your spending and savings goals, then matching a video.
            This usually takes a few seconds.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-6 text-sm text-orange">{error}</p> : null}

      {earned.length > 0 ? (
        <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          You earned {earned.join(", ")}.
        </p>
      ) : null}

      {lesson && !writing ? (
        <div className="mt-8">
          <LessonArticle
            lesson={lesson}
            actions={
              <SaveLessonButton
                lessonId={lesson.id}
                saved={lessonSaved}
                onChange={(next) => {
                  setLessonSaved(next);
                  setSavedLessons((current) => {
                    if (!lesson) {
                      return current;
                    }
                    if (next) {
                      return current.some((item) => item.id === lesson.id)
                        ? current
                        : [lesson, ...current];
                    }
                    return current.filter((item) => item.id !== lesson.id);
                  });
                }}
              />
            }
          />
        </div>
      ) : null}

      {!writing ? (
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">Saved lessons</h2>
            {savedLessons.length > 1 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous saved lessons"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink"
                  onClick={() =>
                    savedScroller.current?.scrollBy({ left: -288, behavior: "smooth" })
                  }
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next saved lessons"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink"
                  onClick={() =>
                    savedScroller.current?.scrollBy({ left: 288, behavior: "smooth" })
                  }
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          {savedLessons.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">
              Save a lesson and it stays in this row.
            </p>
          ) : (
            <ul
              ref={savedScroller}
              className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
              aria-label="Saved lessons"
            >
              {savedLessons.map((item) => (
                <li key={item.id} className="w-72 shrink-0 snap-start">
                  <Link
                    href={`/lessons/${item.id}`}
                    className="game-panel flex h-full flex-col rounded-3xl p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">
                      Saved · {item.minutes} min
                    </p>
                    <p className="mt-2 font-display text-xl leading-tight text-ink">{item.title}</p>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.takeaway}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {earlier.length > 0 && !writing ? (
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">Earlier lessons</h2>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous lessons"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink"
                onClick={() =>
                  scroller.current?.scrollBy({ left: -272, behavior: "smooth" })
                }
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next lessons"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink"
                onClick={() =>
                  scroller.current?.scrollBy({ left: 272, behavior: "smooth" })
                }
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <ul
            ref={scroller}
            className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
            aria-label="Earlier lessons"
          >
            {earlier.map((item) => (
              <li key={item.id} className="w-64 shrink-0 snap-start">
                <Link
                  href={`/lessons/${item.id}`}
                  className="game-panel flex h-full flex-col rounded-3xl p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal">
                    {item.minutes} min
                  </p>
                  <p className="mt-2 font-display text-xl leading-tight text-ink">
                    {item.title}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                    {item.takeaway}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <PageFooterNav />
    </section>
  );
}
