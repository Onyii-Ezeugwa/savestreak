import { Clock } from "lucide-react";

const LESSONS = [
  {
    title: "Needs vs. wants on campus",
    description:
      "A 4-minute lesson on spotting flexible spending without cutting the fun.",
    time: "4 min",
  },
  {
    title: "Start an emergency buffer",
    description:
      "Learn why a small backup fund matters more than a perfect budget.",
    time: "5 min",
  },
  {
    title: "Pay yourself first",
    description:
      "Turn leftover money into a habit by saving before the week begins.",
    time: "3 min",
  },
];

export function FinancialLearning() {
  return (
    <section
      id="financial-learning"
      aria-labelledby="learning-heading"
      className="scroll-mt-24"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            Financial Learning
          </p>
          <h2
            id="learning-heading"
            className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            Short lessons tied to real student decisions.
          </h2>
          <p className="mt-3 text-base leading-7 text-muted">
            $aveStreak keeps financial literacy practical, with small lessons you
            can use the same week you learn them.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {LESSONS.map((lesson) => (
            <article
              key={lesson.title}
              className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(35,31,27,0.04)]"
            >
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-gold">
                <Clock size={14} aria-hidden="true" />
                {lesson.time}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-ink">
                {lesson.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {lesson.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
