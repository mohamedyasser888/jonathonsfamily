import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin-auth";

// GET /api/admin/users — get all users with presence info
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all profiles
  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, username, avatar_url")
    .order("username", { ascending: true });

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  // Get all presence data
  const { data: presenceData } = await admin
    .from("user_presence")
    .select("*");

  // Merge profiles with presence
  const presenceMap = new Map(
    (presenceData || []).map((p: any) => [p.user_id, p])
  );

  const users = (profiles || []).map((profile: any) => {
    const presence = presenceMap.get(profile.id);
    return {
      ...profile,
      is_online: presence?.is_online || false,
      last_seen: presence?.last_seen || null,
    };
  });

  return NextResponse.json(users);
}
