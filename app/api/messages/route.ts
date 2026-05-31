import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin-auth";

// GET /api/messages?user_id=xxx (optional, admin-only filter)
export async function GET(request: NextRequest) {
  const adminSession = await getAdminSession();
  const url = new URL(request.url);
  const filterUserId = url.searchParams.get("user_id");

  if (adminSession) {
    // Admin: use service role client to see all messages
    const admin = createAdminClient();
    
    if (filterUserId) {
      // Get messages between admin and a specific user
      const { data, error } = await admin
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${filterUserId},receiver_id.is.null),and(sender_id.is.null,receiver_id.eq.${filterUserId})`)
        .order("created_at", { ascending: true });
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    } else {
      // Get all messages
      const { data, error } = await admin
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || []);
    }
  }

  // Regular user: get only their messages
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get messages where user is sender or receiver
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/messages — send a message
export async function POST(request: NextRequest) {
  try {
    console.log("[api/messages] POST request received");
    const body = await request.json();
    const { receiver_id, content } = body;

    console.log("[api/messages] Request body:", { receiver_id, content });

    if (!content?.trim()) {
      console.log("[api/messages] Error: content required");
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    // Check for regular user authentication first (takes priority over admin session)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminSession = await getAdminSession();
    console.log("[api/messages] Supabase user:", !!user);
    console.log("[api/messages] Admin session:", !!adminSession);

    // If regular user is authenticated, treat as user (not admin)
    if (user) {
      console.log("[api/messages] User sending message (authenticated via Supabase)");

      // Get user's profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const senderName = profile?.username || user.email?.split("@")[0] || "User";
      console.log("[api/messages] Sender name:", senderName);

      console.log("[api/messages] Inserting user message");
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: null, // User messages to admin have null receiver_id
          sender_name: senderName,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("[api/messages] User insert error:", error);
        console.error("[api/messages] Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log("[api/messages] User message inserted successfully:", data);
      return NextResponse.json(data);
    }

    // Admin session (only if no regular user is authenticated)
    if (adminSession) {
      console.log("[api/messages] Admin sending message");
      // Allow admin to send with null receiver_id (for replies) or valid user UUID
      if (receiver_id === "admin") {
        console.log("[api/messages] Error: Invalid receiver_id 'admin'");
        return NextResponse.json({ error: "Valid receiver_id (user UUID) required for admin" }, { status: 400 });
      }
      // Admin sending a message to a user
      const admin = createAdminClient();
      console.log("[api/messages] Inserting admin message:", { receiver_id, content: content.trim() });

      const { data, error } = await admin
        .from("messages")
        .insert({
          sender_id: null, // Admin messages have null sender_id
          receiver_id, // receiver_id is the user UUID (or null for reply)
          sender_name: "Jonathon Family",
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("[api/messages] Admin insert error:", error);
        console.error("[api/messages] Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log("[api/messages] Admin message inserted successfully:", data);
      return NextResponse.json(data);
    }

    // No authentication - unauthorized
    console.log("[api/messages] Error: Unauthorized (no user or admin session)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error: unknown) {
    console.error("[api/messages] Unhandled error:", error);
    console.error("[api/messages] Error type:", typeof error);
    console.error("[api/messages] Error string:", String(error));
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
