"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[dashboard] signOut error:", error.message);
      return;
    }

    console.log("[dashboard] Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors active:scale-98"
    >
      Sign out
    </button>
  );
}
