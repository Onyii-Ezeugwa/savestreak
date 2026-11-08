"use client";

import { useAuth } from "@/components/AuthProvider";
import { LessonArticle } from "@/components/LessonArticle";
import { SaveLessonButton } from "@/components/SaveLessonButton";
import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface LessonView {
  id: string;
  title: string;
  body: string;
  takeaway: string;
  minutes: number;
  youtubeUrl: string;
  youtubeLabel: string;
  topics?: string[];
}

export default function LessonPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [saved, setSaved] = useState(false);
  const [earned, setEarned] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.status !== "active" || !params.id) {
      return;
    }
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/lessons/${params.id}`, {
        method: "POST",
        credentials: "include",
      });
      const payload = (await response.json()) as {
        lesson?: LessonView;
        justEarned?: Array<{ name: string }>;
        saved?: boolean;
        error?: string;
      };
      if (cancelled) {
        return;
      }
      if (!response.ok || !payload.lesson) {
        setError(payload.error || "That lesson could not be opened.");
        return;
      }
      setLesson(payload.lesson);
      setSaved(Boolean(payload.saved));
      setEarned((payload.justEarned ?? []).map((badge) => badge.name));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, params.id]);

  return (
    <section className="page-enter mx-auto max-w-5xl px-5 py-14 sm:px-6">
      <div className="flex items-center gap-4">
        <BackLink />
        <Link href="/lessons" className="text-sm font-medium text-teal hover:underline">
          All lessons
        </Link>
      </div>
      {error ? <p className="mt-6 text-sm text-orange">{error}</p> : null}
      {earned.length > 0 ? (
        <p className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          You earned {earned.join(", ")}.
        </p>
      ) : null}
      {lesson ? (
        <div className="mt-8">
          <LessonArticle
            lesson={lesson}
            heading="h1"
            actions={
              <SaveLessonButton lessonId={lesson.id} saved={saved} onChange={setSaved} />
            }
          />
        </div>
      ) : null}
      <PageFooterNav />
    </section>
  );
}
