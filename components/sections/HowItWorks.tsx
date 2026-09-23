const STEPS = [
  {
    number: "01",
    title: "Set your goal",
    description: "Tell $aveStreak what you want to save for.",
  },
  {
    number: "02",
    title: "Get your plan",
    description:
      "Receive a manageable savings plan based on your goal and timeline.",
  },
  {
    number: "03",
    title: "Build your streak",
    description: "Track progress, learn, and build consistent saving habits.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-24 border-y border-line bg-cream-dark/35"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 md:py-24 lg:px-8">
        <h2
          id="how-it-works-heading"
          className="font-display text-3xl tracking-tight text-ink sm:text-4xl"
        >
          How it works
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(35,31,27,0.04)]"
            >
              <p className="font-display text-3xl text-teal">{step.number}</p>
              <h3 className="mt-4 text-xl font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
