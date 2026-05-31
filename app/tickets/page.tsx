import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import MyTicketsClient from "./MyTicketsClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-white mb-2">My tickets</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Live updates from the database — your current orders appear here.
        </p>
        <MyTicketsClient userId={user.id} />
      </main>
    </div>
  );
}
