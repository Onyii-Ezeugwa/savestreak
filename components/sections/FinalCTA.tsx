import { Button } from "@/components/Button";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8"
    >
      <div className="rounded-[2rem] border border-line bg-teal px-6 py-12 text-center text-white shadow-[0_16px_40px_rgba(15,95,98,0.16)] sm:px-10 md:py-16">
        <h2
          id="final-cta-heading"
          className="font-display text-3xl tracking-tight sm:text-4xl"
        >
          Your next savings goal starts here.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85">
          Start small, stay consistent, and let $aveStreak help you build the
          habit.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/signup" variant="inverse">
            Create Free Account
          </Button>
          <Button
            href="/#goal-planner"
            variant="ghost"
            className="border border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            Try Goal Planner
          </Button>
        </div>
      </div>
    </section>
  );
}
