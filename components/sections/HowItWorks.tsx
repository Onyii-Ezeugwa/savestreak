import { HexBadge } from "@/components/HexBadge";

const STEPS = [
  {
    level: "1",
    title: "Set your quest",
    description: "Tell $aveStreak what you want to save for and when.",
  },
  {
    level: "2",
    title: "Unlock your plan",
    description:
      "Get a manageable savings path based on your goal and timeline.",
  },
  {
    level: "3",
    title: "Build your streak",
    description: "Log deposits, earn XP, and keep the habit going.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-24 border-y border-line bg-cream-dark/45"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
          How to play
        </p>
        <h2
          id="how-it-works-heading"
          className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl"
        >
          Three levels. One habit.
        </h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.level} className="relative">
              <div className="relative mb-4 flex h-16 items-center justify-center">
                {step.level !== "3" ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 hidden h-0.5 w-[calc(100%+2rem)] -translate-y-1/2 bg-gold md:block"
                  />
                ) : null}
                <HexBadge
                  size="lg"
                  className="relative z-10 bg-teal text-white"
                >
                  {step.level}
                </HexBadge>
              </div>
              <div className="game-panel rounded-3xl p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
                  Level {step.level}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
