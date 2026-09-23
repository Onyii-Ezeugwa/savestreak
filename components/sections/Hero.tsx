import { Button } from "@/components/Button";
import { DashboardPreview } from "@/components/DashboardPreview";
import { HexBadge } from "@/components/HexBadge";
import { Flame, Star, Trophy } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_80%_20%,rgba(22,124,128,0.08),transparent_28%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
        <div className="animate-fade-up">
          <p className="hud-chip text-teal">
            <span className="h-2 w-2 rounded-full bg-teal" />
            Built for students
          </p>
          <h1 className="mt-5 font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
            Turn saving into a game you can actually win.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
            $aveStreak makes money habits feel like quests: set a goal, earn
            streak days, level up with lessons, and get AI coaching when you
            need a nudge.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <HexBadge className="animate-hex-float bg-orange text-white">
              <Flame size={16} aria-hidden="true" />
            </HexBadge>
            <HexBadge className="animate-hex-float-slow bg-gold text-ink">
              <Star size={16} aria-hidden="true" />
            </HexBadge>
            <HexBadge className="animate-hex-float bg-teal text-white [animation-delay:900ms]">
              <Trophy size={16} aria-hidden="true" />
            </HexBadge>
            <span className="text-sm font-medium text-muted">
              Streaks, XP, and badges
            </span>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup" size="lg">
              Start Your Streak
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
      </div>
    </section>
  );
}
