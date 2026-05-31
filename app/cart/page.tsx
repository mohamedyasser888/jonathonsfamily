import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import CartItems from "./CartItems";
import type { Profile } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile = null;
  const { data: profileData } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  profile = profileData;

  // Auto-create profile row if missing
  if (!profile && user) {
    console.log("[cart] Profile row missing, auto-creating...");
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          email: user.email ?? "",
        },
      ])
      .select()
      .single();
    profile = newProfile;
  }

  // Query user cart items joined with products table
  const { data: cartData, error: cartError } = await supabase
    .from("cart")
    .select(`
      id,
      user_id,
      product_id,
      quantity,
      added_at,
      products:products (
        id,
        name,
        image_url,
        price,
        description,
        collection_id,
        collections:collections (
          name
        )
      )
    `)
    .eq("user_id", user.id);

  if (cartError) {
    console.error("[cart] Cart loading failed:", cartError);
  }

  const normalizedItems = (cartData || []) as any[];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Reusable premium navigation */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-1 border-b border-zinc-900 pb-4">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-gradient-to-b from-violet-600 to-indigo-600 rounded-sm" />
              Shopping Cart
            </h1>
            <p className="text-sm text-zinc-500">
              Review your items and create a checkout ticket to submit your order.
            </p>
          </div>

          {/* CartItems List and calculations */}
          <CartItems
            initialItems={normalizedItems}
            userId={user.id}
            username={profile?.username || ""}
          />
        </div>
      </main>
    </div>
  );
}
