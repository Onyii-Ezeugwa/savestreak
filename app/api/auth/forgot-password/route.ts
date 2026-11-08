import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices } from "@/lib/backend/runtime";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const { auth } = await getServices();
    const result = await auth.requestPasswordReset(body.email);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
