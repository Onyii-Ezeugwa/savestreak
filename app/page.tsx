import { GoalPlanner } from "@/components/GoalPlanner";
import { About } from "@/components/sections/About";
import { Challenges } from "@/components/sections/Challenges";
import { Features } from "@/components/sections/Features";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { FinancialLearning } from "@/components/sections/FinancialLearning";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";

export default function Home() {
  return (
    <>
      <Hero />
      <GoalPlanner />
      <Features />
      <HowItWorks />
      <Challenges />
      <FinancialLearning />
      <About />
      <FinalCTA />
    </>
  );
}
