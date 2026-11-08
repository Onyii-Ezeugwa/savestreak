"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

interface ChartPoint {
  capturedAt: string;
  netWorth: number;
  partial: boolean;
}

interface ChartRow {
  label: string;
  full: string;
  netWorth: number;
  partial: boolean;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: ChartRow }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const row = payload[0]?.payload;
  const value = payload[0]?.value;
  if (!row || typeof value !== "number") {
    return null;
  }
  return (
    <div className="rounded-2xl border border-line bg-card px-3 py-2 shadow-[0_8px_24px_rgba(35,31,27,0.08)]">
      <p className="text-xs text-muted">{row.full}</p>
      <p className="mt-1 font-display text-xl text-ink">{MONEY.format(value)}</p>
    </div>
  );
}

export function NetWorthChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-52 items-center justify-center rounded-2xl border border-dashed border-line bg-cream/60 px-6 text-center">
        <p className="max-w-sm text-sm leading-6 text-muted">
          Net worth history starts the next time balances are saved.
        </p>
      </div>
    );
  }

  const rows: ChartRow[] = points.map((point) => {
    const date = new Date(point.capturedAt);
    return {
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      full: date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      netWorth: point.netWorth,
      partial: point.partial,
    };
  });
  const values = rows.map((row) => row.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.25, Math.abs(max) * 0.08, 1);

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="net-worth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#167c80" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#167c80" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e4d4bc" strokeDasharray="4 8" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tick={{ fill: "#6f675e", fontSize: 12 }}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            axisLine={false}
            tickLine={false}
            width={64}
            tick={{ fill: "#6f675e", fontSize: 12 }}
            tickFormatter={(value: number) => COMPACT.format(value)}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: "#167c80", strokeOpacity: 0.35, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net worth"
            stroke="#167c80"
            strokeWidth={2.5}
            fill="url(#net-worth-fill)"
            dot={{ r: 4, stroke: "#fffdf8", strokeWidth: 2, fill: "#167c80" }}
            activeDot={{ r: 6, stroke: "#fffdf8", strokeWidth: 2, fill: "#0f5f62" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
