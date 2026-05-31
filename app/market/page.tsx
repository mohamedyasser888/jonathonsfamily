import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import MarketClient from "./MarketClient";
import type { Profile } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile?.username || !profile?.avatar_url) {
    redirect("/continue-login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <MarketClient userId={user.id} username={profile.username || "User"} />
    </div>
  );
}
