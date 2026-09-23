import {
  frequencyLabel,
  fromWeeklyAmount,
  roundMoney,
  toWeeklyAmount,
} from "./savings";
import type { GoalPlan, GoalPlanRequest } from "./types";
import { weeksUntil } from "./validation";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

const DEFAULT_FREE_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-s-2.1:free",
  "dots-studio/dots-3-note-preview:free",
  "nex-agi/nex-n2.5-pro:free",
  "thinkingmachines/inkling:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
] as const;

function buildDefaultMilestones(
  target: number,
  timelineWeeks: number,
): GoalPlan["milestones"] {
  return [0.5, 1].map((portion) => {
    const amount = Math.max(1, Math.round(target * portion));
    const week = Math.max(1, Math.round(timelineWeeks * portion));
    return {
      week,
      amount,
      note:
        portion === 1
          ? `Reach $${amount} by week ${week}.`
          : `Be around $${amount} by week ${week}.`,
    };
  });
}

function resolveCadence(input: GoalPlanRequest, weeklySavings: number) {
  const cadenceFrequency = input.savingsFrequency ?? "week";
  const cadenceAmount =
    input.savingsAmount !== undefined
      ? roundMoney(input.savingsAmount)
      : roundMoney(fromWeeklyAmount(weeklySavings, cadenceFrequency));

  return { cadenceAmount, cadenceFrequency };
}

function buildDefaultSummary(
  input: GoalPlanRequest,
  weeklySavings: number,
  timelineWeeks: number,
): string {
  const { cadenceAmount, cadenceFrequency } = resolveCadence(input, weeklySavings);
  const cadence = frequencyLabel(cadenceFrequency);

  return `Save about $${cadenceAmount} ${cadence} to reach ${input.goalName} in about ${timelineWeeks} weeks. Move that amount first, then spend what is left.`;
}

export function buildMockPlan(input: GoalPlanRequest): GoalPlan {
  const timelineWeeks = weeksUntil(input.targetDate);
  const weeklySavings = roundMoney(
    input.savingsAmount !== undefined && input.savingsFrequency
      ? toWeeklyAmount(input.savingsAmount, input.savingsFrequency)
      : input.amount / timelineWeeks,
  );
  const { cadenceAmount, cadenceFrequency } = resolveCadence(input, weeklySavings);
  const cadence = frequencyLabel(cadenceFrequency);

  return {
    goal: input.goalName,
    target: input.amount,
    timelineWeeks,
    weeklySavings,
    cadenceAmount,
    cadenceFrequency,
    summary: buildDefaultSummary(input, weeklySavings, timelineWeeks),
    milestones: buildDefaultMilestones(input.amount, timelineWeeks),
    suggestions: [
      `Move $${cadenceAmount} ${cadence} as soon as money comes in, before everyday spending starts. Treating that transfer like a bill makes the rest of the week easier to manage.`,
      "Pick one flexible campus spend to trim this month, such as takeout, rideshares, or an unused subscription. Send that leftover amount straight to this goal so the cut actually shows up in your savings.",
      "Check your progress once a week, ideally on the same day. If you miss the full amount, still save something small so the streak stays intact.",
      `Create a savings pot named after ${input.goalName} and make the first transfer today. Keeping the money separate makes it less tempting to spend and easier to see progress.`,
    ],
    source: "mock",
  };
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function getMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  return "";
}

function normalizePlan(raw: unknown, input: GoalPlanRequest): GoalPlan | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const goal =
    typeof value.goal === "string" && value.goal.trim()
      ? value.goal.trim()
      : input.goalName;
  const target =
    typeof value.target === "number" && value.target > 0
      ? value.target
      : input.amount;
  const timelineWeeks =
    typeof value.timelineWeeks === "number" && value.timelineWeeks > 0
      ? Math.round(value.timelineWeeks)
      : weeksUntil(input.targetDate);
  const weeklySavings =
    typeof value.weeklySavings === "number" && value.weeklySavings > 0
      ? Math.round(value.weeklySavings)
      : Math.max(1, Math.ceil(target / timelineWeeks));

  const suggestions = Array.isArray(value.suggestions)
    ? value.suggestions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
    : [];

  if (suggestions.length < 3) {
    const fallbackTips = buildMockPlan(input).suggestions;
    for (const tip of fallbackTips) {
      if (suggestions.length >= 4) {
        break;
      }
      if (!suggestions.includes(tip)) {
        suggestions.push(tip);
      }
    }
  }

  if (suggestions.length < 3) {
    return null;
  }

  const summary =
    typeof value.summary === "string" && value.summary.trim()
      ? value.summary.trim()
      : buildDefaultSummary(
          { ...input, goalName: goal, amount: target },
          weeklySavings,
          timelineWeeks,
        );

  const milestones = Array.isArray(value.milestones)
    ? value.milestones
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const milestone = item as Record<string, unknown>;
          const week =
            typeof milestone.week === "number" && milestone.week > 0
              ? Math.round(milestone.week)
              : 0;
          const amount =
            typeof milestone.amount === "number" && milestone.amount > 0
              ? Math.round(milestone.amount)
              : 0;
          const note =
            typeof milestone.note === "string" ? milestone.note.trim() : "";
          if (!week || !amount || !note) {
            return null;
          }
          return { week, amount, note };
        })
        .filter((item): item is GoalPlan["milestones"][number] => item !== null)
        .slice(0, 5)
    : [];

  const { cadenceAmount, cadenceFrequency } = resolveCadence(
    input,
    weeklySavings,
  );

  return {
    goal,
    target,
    timelineWeeks,
    weeklySavings,
    cadenceAmount,
    cadenceFrequency,
    summary,
    milestones:
      milestones.length >= 2
        ? milestones.slice(0, 3)
        : buildDefaultMilestones(target, timelineWeeks),
    suggestions,
    source: "ai",
  };
}

function isAllowedFreeModel(model: string): boolean {
  const value = model.trim().toLowerCase();
  if (!value) {
    return false;
  }
  if (value.startsWith("openai/")) {
    return false;
  }
  return value.endsWith(":free") || value === "openrouter/free";
}

export function getModelQueue(): string[] {
  const fromList = (process.env.OPENROUTER_MODELS ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(isAllowedFreeModel);

  const fromSingle = (process.env.OPENROUTER_MODEL ?? "").trim();
  const extra =
    fromSingle && isAllowedFreeModel(fromSingle) ? [fromSingle] : [];

  return [...new Set([...extra, ...fromList, ...DEFAULT_FREE_MODELS])];
}

function buildMessages(input: GoalPlanRequest) {
  const timelineWeeks = weeksUntil(input.targetDate);
  const cadenceHint =
    input.savingsAmount !== undefined && input.savingsFrequency
      ? `The student said they could comfortably save about $${input.savingsAmount} ${frequencyLabel(input.savingsFrequency)}. Build the plan around that cadence, not only weekly deposits.`
      : "The student did not specify a comfortable savings amount or cadence.";

  return [
    {
      role: "system",
      content:
        "You are a friendly student savings coach for $aveStreak. Return ONLY valid JSON. Do not give investment, credit, tax, or professional financial advice. Be practical, realistic, and encouraging. Never mention being an AI model. Do not use em dashes.",
    },
    {
      role: "user",
      content: `Create a medium-length savings plan for a student. Keep it useful, not tiny, and not long-winded.
Goal: ${input.goalName}
Target amount: $${input.amount}
Target date: ${input.targetDate}
Estimated timeline: about ${timelineWeeks} weeks
${cadenceHint}

Return JSON with this exact shape:
{
  "goal": "string",
  "target": number,
  "timelineWeeks": number,
  "weeklySavings": number,
  "summary": "one or two sentence overview",
  "milestones": [
    { "week": number, "amount": number, "note": "short checkpoint" }
  ],
  "suggestions": [
    "habit tip 1",
    "habit tip 2"
  ]
}

Rules:
- weeklySavings should be a realistic whole-dollar weekly equivalent.
- summary should be 1-2 sentences.
- milestones should include 2 checkpoints: halfway and the goal.
- suggestions must include exactly 4 tips.
- Each tip should be 2 sentences: first the action, then a brief why or how. Do not write one-liners.
- Match tips to their cadence when they gave one.
- Cover a deposit habit, one spending swap, a check-in, and a first action.
- Do not include extra keys or markdown.`,
    },
  ];
}

async function requestPlanFromModel(
  apiKey: string,
  model: string,
  input: GoalPlanRequest,
): Promise<GoalPlan | null> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "$aveStreak",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: buildMessages(input),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    error?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };

  if (payload.error) {
    return null;
  }

  const content = getMessageContent(payload.choices?.[0]?.message?.content);
  if (!content) {
    return null;
  }

  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return null;
  }

  try {
    return normalizePlan(JSON.parse(jsonText) as unknown, input);
  } catch {
    return null;
  }
}

export async function generateGoalPlan(
  input: GoalPlanRequest,
): Promise<GoalPlan> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return buildMockPlan(input);
  }

  for (const model of getModelQueue()) {
    try {
      const plan = await requestPlanFromModel(apiKey, model, input);
      if (plan) {
        return plan;
      }
    } catch {
      // Rate limits, timeouts, and provider outages should fall through.
    }
  }

  throw new Error("The savings planner is unavailable right now.");
}
