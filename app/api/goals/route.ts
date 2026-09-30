import { jsonError } from "@/lib/backend/http";
import { requireUserRecord, getServices } from "@/lib/backend/runtime";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUserRecord();
    const { goals } = await getServices();
    return NextResponse.json({ goals: await goals.list(user) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const body = await request.json();
    const { goals } = await getServices();
    const created = await goals.create(user, body);
    return NextResponse.json({ goal: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
