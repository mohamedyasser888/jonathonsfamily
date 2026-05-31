import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase-env";

/**
 * Creates a privileged Supabase client using the service role key.
 * Used exclusively in API routes after verifying the admin cookie session.
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!hasServiceRoleKey()) {
    console.warn(
      "[admin] SUPABASE_SERVICE_ROLE_KEY is missing in .env.local — uploads and admin tickets may fail."
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
