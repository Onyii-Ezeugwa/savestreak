import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { ApiError } from "@/lib/backend/types";
import { supabaseUrl } from "./env";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new ApiError(500, "Password reset is not available right now.");
  }
  return key;
}

function adminClient() {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function updateAuthPassword(userId: string, password: string) {
  const { error } = await adminClient().auth.admin.updateUserById(userId, {
    password,
  });
  if (error) {
    throw new ApiError(500, "Could not update that password. Request a new link.");
  }
}

export async function signOutAuthSessions(userId: string) {
  const key = serviceRoleKey();
  const response = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${userId}/logout`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  );
  if (response.ok || response.status === 204) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ApiError(500, "Could not sign out other sessions.");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`delete from auth.sessions where user_id = $1`, [userId]);
    await client.query(`delete from auth.refresh_tokens where user_id = $1`, [
      userId,
    ]);
  } finally {
    await client.end();
  }
}
