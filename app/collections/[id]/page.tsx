import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import CollectionDetailClient from "../CollectionDetailClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
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
        <CollectionDetailClient collectionId={id} userId={user.id} />
      </main>
    </div>
  );
}
