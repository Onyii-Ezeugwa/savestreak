import { jsonError, jsonOk } from "@/lib/backend/http";
import { getServices } from "@/lib/backend/runtime";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createServerSupabase();
    const { auth } = await getServices();
    const result = await auth.login(supabase, body);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
