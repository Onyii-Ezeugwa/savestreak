import { Button } from "@/components/Button";
import { HexBadge } from "@/components/HexBadge";
import { HexLitPanel } from "@/components/HexLitPanel";
import { Flame, Star, Trophy } from "lucide-react";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8"
    >
      <HexLitPanel className="relative overflow-hidden rounded-[2rem] border border-teal-dark bg-teal px-6 py-12 text-center text-white shadow-[0_16px_40px_rgba(15,95,98,0.16)] sm:px-10 md:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='56' height='64' viewBox='0 0 56 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M28 2 L52 16 V44 L28 58 L4 44 V16 Z' fill='none' stroke='white' stroke-width='0.8'/%3E%3C/svg%3E\")",
            backgroundSize: "56px 64px",
          }}
        />
        <div className="relative">
          <div className="mb-5 flex justify-center gap-2">
            <HexBadge className="animate-hex-float bg-white/15 text-white">
              <Flame size={16} />
            </HexBadge>
            <HexBadge className="animate-hex-float-slow bg-gold text-ink">
              <Star size={16} />
            </HexBadge>
            <HexBadge className="animate-hex-float bg-white/15 text-white [animation-delay:900ms]">
              <Trophy size={16} />
            </HexBadge>
          </div>
          <h2
            id="final-cta-heading"
            className="font-display text-3xl tracking-tight sm:text-4xl"
          >
            Your next savings streak starts here.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/85">
            Start small, stay consistent, and let $aveStreak help you level up
            the habit.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" variant="inverse">
              Start Your First Quest
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
      </HexLitPanel>
    </section>
  );
}
