"use client";

import { Button } from "@/components/Button";
import { apiRequest, type ApiErrorPayload } from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { useEffect, useState } from "react";

interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
}

interface QuizAttempt {
  id: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  createdAt: string;
}

interface QuizReview extends QuizAttempt {
  questions: Array<{
    prompt: string;
    choices: string[];
    selected: number;
    correctIndex: number;
    explanation: string;
  }>;
}

interface QuizPayload {
  passPercent: number;
  completed: boolean;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  review: QuizReview | null;
}

export function LessonQuiz({ lessonId }: { lessonId: string }) {
  const [payload, setPayload] = useState<QuizPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taking, setTaking] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setPayload(null);
    setTaking(false);
    setSelected([]);
    apiRequest<QuizPayload>(`/lessons/${lessonId}/quiz`)
      .then((next) => {
        if (!active) {
          return;
        }
        setPayload(next);
        setTaking(next.attempts.length === 0);
        setSelected(next.questions.map(() => -1));
      })
      .catch((caught: ApiErrorPayload) => {
        if (active) {
          setError(caught.error);
        }
      });
    return () => {
      active = false;
    };
  }, [lessonId]);

  async function submit() {
    if (!payload || selected.some((choice) => choice < 0)) {
      setError("Answer every question.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await apiRequest<QuizPayload>(`/lessons/${lessonId}/quiz`, {
        method: "POST",
        body: JSON.stringify({ answers: selected }),
      });
      setPayload(next);
      setTaking(false);
    } catch (caught) {
      setError((caught as ApiErrorPayload).error);
    } finally {
      setBusy(false);
    }
  }

  if (!payload && !error) {
    return null;
  }

  const showForm = Boolean(payload && taking && !payload.completed);

  return (
    <section className="mt-4 game-panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">Quiz</h2>
          <p className="mt-1 text-sm text-muted">
            {payload
              ? `Pass with ${payload.passPercent}% or higher. Nothing is marked complete until you pass.`
              : "The quiz for this lesson could not be loaded."}
          </p>
        </div>
        {payload?.completed ? (
          <p className="rounded-full border border-green/30 bg-green/10 px-3 py-1 text-xs font-semibold text-green">
            Lesson complete
          </p>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-orange">{error}</p> : null}

      {showForm && payload ? (
        <div className="mt-5 space-y-5">
          {payload.questions.map((question, questionIndex) => (
            <fieldset key={question.id}>
              <legend className="text-sm font-semibold text-ink">
                {questionIndex + 1}. {question.prompt}
              </legend>
              <div className="mt-2 space-y-2">
                {question.choices.map((choice, choiceIndex) => (
                  <label
                    key={choice}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                      selected[questionIndex] === choiceIndex
                        ? "border-teal bg-teal/5 text-ink"
                        : "border-line text-ink"
                    }`}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      name={question.id}
                      checked={selected[questionIndex] === choiceIndex}
                      onChange={() =>
                        setSelected((current) =>
                          current.map((value, index) =>
                            index === questionIndex ? choiceIndex : value,
                          ),
                        )
                      }
                    />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
            {busy ? "Scoring..." : "Submit quiz"}
          </Button>
        </div>
      ) : null}

      {payload?.review && !showForm ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-ink">
            {payload.review.score} of {payload.review.total} ({payload.review.percent}%).{" "}
            {payload.review.passed ? "You passed." : "Not a passing score."}
          </p>
          <ul className="mt-4 space-y-3">
            {payload.review.questions.map((question) => {
              const picked = question.choices[question.selected] ?? "No answer";
              const correct = question.choices[question.correctIndex] ?? "";
              const right = question.selected === question.correctIndex;
              return (
                <li key={question.prompt} className="rounded-2xl border border-line px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{question.prompt}</p>
                  <p className={`mt-2 text-sm ${right ? "text-teal" : "text-orange"}`}>
                    Your answer: {picked}
                  </p>
                  {right ? null : (
                    <p className="mt-1 text-sm text-ink">Correct answer: {correct}</p>
                  )}
                  <p className="mt-2 text-sm leading-6 text-muted">{question.explanation}</p>
                </li>
              );
            })}
          </ul>
          {!payload.completed ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setError(null);
                setSelected(payload.questions.map(() => -1));
                setTaking(true);
              }}
            >
              Retake quiz
            </Button>
          ) : null}
        </div>
      ) : null}

      {payload && payload.attempts.length > 0 ? (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">Saved attempts</h3>
          <ul className="mt-2 space-y-1">
            {payload.attempts.map((attempt) => (
              <li key={attempt.id} className="text-sm text-muted">
                {formatDisplayDate(attempt.createdAt.slice(0, 10))}: {attempt.score} of{" "}
                {attempt.total} ({attempt.percent}%). {attempt.passed ? "Passed" : "Not passed"}.
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
