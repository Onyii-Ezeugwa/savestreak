import { jsonError, jsonOk } from "@/lib/backend/http";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
