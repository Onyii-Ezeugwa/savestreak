import { FeatureCard } from "@/components/FeatureCard";
import {
  BookOpen,
  Flame,
  Goal,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    title: "Goal-Based Savings",
    description: "Turn a savings target into a quest with manageable weekly goals.",
    icon: Goal,
    accent: "teal" as const,
    badge: "Quest",
  },
  {
    title: "Automatic Expense Tracking",
    description: "Keep track of where your money is going.",
    icon: Wallet,
    accent: "green" as const,
    badge: "Map",
  },
  {
    title: "Savings Streaks",
    description: "Build consistency and celebrate saving milestones.",
    icon: Flame,
    accent: "orange" as const,
    badge: "Streak",
  },
  {
    title: "AI Coaching",
    description: "Get personalized insights based on your goals and progress.",
    icon: Sparkles,
    accent: "teal" as const,
    badge: "Coach",
  },
  {
    title: "Financial Learning",
    description:
      "Complete quick financial literacy lessons connected to real-life decisions.",
    icon: BookOpen,
    accent: "gold" as const,
    badge: "+XP",
  },
  {
    title: "Student Community",
    description:
      "Compare progress through friendly campus and regional challenges.",
    icon: Users,
    accent: "green" as const,
    badge: "Arena",
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-24"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            Power-ups
          </p>
          <h2
            id="features-heading"
            className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            Everything you need to make saving stick.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
