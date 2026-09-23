import { Button } from "@/components/Button";
import { DashboardPreview } from "@/components/DashboardPreview";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
      <div className="animate-fade-up">
        <p className="inline-flex rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal">
          Built for students
        </p>
        <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
          Save smarter. Build habits. Reach your goals.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
          $aveStreak turns saving into a habit you can actually stick with,
          with personalized goals, streaks, financial learning, and AI-powered
          guidance.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/signup" size="lg">
            Start Saving
          </Button>
          <Button href="/#goal-planner" variant="outline" size="lg">
            Try AI Goal Planner
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted">
          No bank account required to get started.
        </p>
      </div>

      <div className="animate-fade-up animate-delay-1">
        <DashboardPreview />
      </div>
    </section>
  );
}
