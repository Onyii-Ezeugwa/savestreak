import { jsonError } from "@/lib/backend/http";
import { getServices } from "@/lib/backend/runtime";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const { consent } = await getServices();
    return NextResponse.json(await consent.get(token));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = (await request.json()) as { decision?: unknown };
    const { consent } = await getServices();
    return NextResponse.json(await consent.decide(token, body.decision));
  } catch (error) {
    return jsonError(error);
  }
}
