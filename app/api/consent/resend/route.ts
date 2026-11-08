import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices, requireUserRecord } from "@/lib/backend/runtime";

export async function POST(request: Request) {
  try {
    const user = await requireUserRecord();
    const body = (await request.json()) as { guardianEmail?: unknown };
    const { consent } = await getServices();
    return jsonOk(await consent.resend(user, body.guardianEmail));
  } catch (error) {
    return jsonError(error);
  }
}
