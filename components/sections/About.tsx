export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-24 border-y border-line bg-cream-dark/35"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            About
          </p>
          <h2
            id="about-heading"
            className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            A savings coach that feels like a study buddy, not a bank.
          </h2>
        </div>
        <p className="text-base leading-7 text-muted">
          $aveStreak is built for students who want better money habits without
          the jargon. We combine goals, streaks, community challenges, and
          friendly AI coaching so saving feels doable, even on a campus
          budget. You can try the Goal Planner first, then create an account
          when you are ready.
        </p>
      </div>
    </section>
  );
}
