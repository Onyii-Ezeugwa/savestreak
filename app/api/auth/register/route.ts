import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices } from "@/lib/backend/runtime";
import { createAuthApiClient } from "@/lib/supabase/auth-api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = new URL(request.url).origin;
    const supabase = createAuthApiClient();
    const { auth } = await getServices();
    const result = await auth.register(supabase, body, origin);
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
