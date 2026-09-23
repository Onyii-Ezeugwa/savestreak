import { generateGoalPlan } from "@/lib/openrouter";
import {
  getPlannerTrialStatus,
  parsePlannerUses,
  PLANNER_TRIAL_LIMIT,
  PLANNER_USAGE_COOKIE,
  PLANNER_USAGE_MAX_AGE,
} from "@/lib/planner-trial";
import { validateGoalPlanInput } from "@/lib/validation";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function usageCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLANNER_USAGE_MAX_AGE,
  };
}

async function readTrialStatus() {
  const store = await cookies();
  return getPlannerTrialStatus(
    parsePlannerUses(store.get(PLANNER_USAGE_COOKIE)?.value),
  );
}

export async function GET() {
  return NextResponse.json(await readTrialStatus());
}

export async function POST(request: Request) {
  const trial = await readTrialStatus();

  if (trial.remaining <= 0) {
    return NextResponse.json(
      {
        error:
          "You have used all 5 free Goal Planner trials. Create a free account to keep planning.",
        remainingUses: 0,
      },
      { status: 429 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please send a valid savings goal request." },
      { status: 400 },
    );
  }

  const validation = validateGoalPlanInput(
    (body ?? {}) as Record<string, unknown>,
  );

  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      {
        error: "Please check your goal details and try again.",
        fieldErrors: validation.errors,
      },
      { status: 400 },
    );
  }

  try {
    const plan = await generateGoalPlan(validation.data);
    const nextUsed = trial.used + 1;
    const remainingUses = PLANNER_TRIAL_LIMIT - nextUsed;
    const response = NextResponse.json({
      ...plan,
      remainingUses,
    });

    response.cookies.set(
      PLANNER_USAGE_COOKIE,
      String(nextUsed),
      usageCookieOptions(),
    );

    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not build your plan just now. Check your connection and try again.",
      },
      { status: 502 },
    );
  }
}
