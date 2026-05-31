import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import CollectionsClient from "./CollectionsClient";
import CollectionsPageClient from "./CollectionsPageClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome to <span className="gradient-text">Jonathon Store</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            You logged in successfully. Browse collections, add items to cart, then
            confirm to create a ticket.
          </p>
        </div>
        <CollectionsPageClient>
          <CollectionsClient />
        </CollectionsPageClient>
      </main>
    </div>
  );
}
