import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin-auth";

// POST /api/messages/read — mark messages as read
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message_ids } = body;

  if (!Array.isArray(message_ids) || message_ids.length === 0) {
    return NextResponse.json({ error: "message_ids array required" }, { status: 400 });
  }

  const adminSession = await getAdminSession();

  if (adminSession) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("messages")
      .update({ is_read: true })
      .in("id", message_ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only mark messages where this user is the receiver
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .in("id", message_ids)
    .eq("receiver_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
