import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase-env";

const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
