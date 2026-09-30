import { jsonError, jsonOk } from "@/lib/backend/http";
import { requireUserRecord } from "@/lib/backend/runtime";
import { toPublicUser } from "@/lib/backend/auth-service";

export async function GET() {
  try {
    const user = await requireUserRecord();
    return jsonOk({ user: toPublicUser(user) });
  } catch (error) {
    return jsonError(error);
  }
}
