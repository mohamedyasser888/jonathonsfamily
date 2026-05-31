/**
 * Validates Supabase env vars. Used by browser client, server client, and middleware.
 */
export function getSupabaseEnv(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    const missing = [
      !supabaseUrl?.trim() && "NEXT_PUBLIC_SUPABASE_URL",
      !supabaseAnonKey?.trim() && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean);

    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. ` +
        `Add them to .env.local in the project root (jonathons/), not inside /app. ` +
        `Then stop and restart the dev server (npm run dev).`
    );
  }

  return {
    supabaseUrl: supabaseUrl.trim(),
    supabaseAnonKey: supabaseAnonKey.trim(),
  };
}
