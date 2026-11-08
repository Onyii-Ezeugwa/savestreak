import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices } from "@/lib/backend/runtime";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
    };
    const { auth } = await getServices();
    const result = await auth.confirmPasswordReset(body);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
