import { jsonError } from "@/lib/backend/http";
import { requireUserRecord, getServices } from "@/lib/backend/runtime";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUserRecord();
    const body = await request.json();
    const { goals } = await getServices();
    return NextResponse.json({ goal: await goals.update(user, id, body) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await requireUserRecord();
    const { goals } = await getServices();
    await goals.remove(user, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
