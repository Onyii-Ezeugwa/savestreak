import type { ReactNode } from "react";

function YoutubeMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
    </svg>
  );
}

interface LessonArticleProps {
  lesson: {
    title: string;
    body: string;
    takeaway: string;
    minutes: number;
    youtubeUrl: string;
    youtubeLabel: string;
    topics?: string[];
  };
  heading?: "h1" | "h2";
  actions?: ReactNode;
}

export function LessonArticle({ lesson, heading = "h2", actions }: LessonArticleProps) {
  const Title = heading;
  const paragraphs = lesson.body.split(/\n\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <article className="game-panel rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            About {lesson.minutes} minutes
          </p>
          {(lesson.topics ?? []).map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-line bg-cream px-2.5 py-0.5 text-xs font-semibold capitalize text-ink"
            >
              {topic}
            </span>
          ))}
        </div>
        {actions}
      </div>
      <Title className="mt-3 font-display text-3xl text-ink sm:text-4xl">{lesson.title}</Title>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className="mt-4 text-sm leading-7 text-muted">
          {paragraph}
        </p>
      ))}
      <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">Keep this</p>
        <p className="mt-1 text-sm leading-6 text-ink">{lesson.takeaway}</p>
      </div>
      {lesson.youtubeUrl ? (
        <a
          href={lesson.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[#ff0033]/25 bg-[#ff0033]/10 px-4 py-3 transition-colors hover:border-[#ff0033]/50 hover:bg-[#ff0033]/15"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff0033] text-white">
              <YoutubeMark />
            </span>
            <span className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#c40022]">
                Watch
              </span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-ink">
                {lesson.youtubeLabel}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[#c40022]">Open</span>
        </a>
      ) : null}
    </article>
  );
}
