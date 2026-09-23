import { HexBadge } from "@/components/HexBadge";
import { Flame, Trophy } from "lucide-react";

const BOARD = [
  { place: "1", name: "Amina · East Hall", score: "18-day streak" },
  { place: "2", name: "Luis · Off-campus", score: "14-day streak" },
  { place: "3", name: "You", score: "12-day streak", highlight: true },
];

export function Challenges() {
  return (
    <section aria-labelledby="challenges-heading" className="scroll-mt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-20 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
            Campus arena
          </p>
          <h2
            id="challenges-heading"
            className="mt-3 font-display text-3xl tracking-tight text-ink sm:text-4xl"
          >
            Friendly competition, not financial pressure.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Join residence-hall and regional streak boards. You compare
            consistency, not account balances.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <HexBadge className="animate-hex-float bg-gold text-ink">
              <Trophy size={16} aria-hidden="true" />
            </HexBadge>
            <HexBadge className="animate-hex-float-slow bg-orange text-white">
              <Flame size={16} aria-hidden="true" />
            </HexBadge>
            <span className="self-center text-sm font-medium text-muted">
              House cup + streak season
            </span>
          </div>
        </div>

        <ol className="game-panel rounded-3xl p-3 sm:p-4">
          <li className="flex items-center gap-2 px-4 pb-3 pt-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">
            <span className="animate-soft-pulse h-2 w-2 rounded-full bg-gold" />
            Live board
          </li>
          {BOARD.map((row) => (
            <li
              key={row.place}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 ${
                row.highlight ? "bg-teal/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <HexBadge
                  size="sm"
                  className={
                    row.highlight ? "bg-teal text-white" : "bg-cream-dark text-ink"
                  }
                >
                  {row.place}
                </HexBadge>
                <div>
                  <p className="text-sm font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">{row.score}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
