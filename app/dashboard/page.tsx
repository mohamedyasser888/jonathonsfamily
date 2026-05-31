import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import ProfileForm from "./ProfileForm";
import Navbar from "@/components/Navbar";
import type { Profile, Collection } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[dashboard] auth error:", userError);
  }

  if (!user) {
    console.log("[dashboard] No session, redirecting to login");
    redirect("/login");
  }

  let profile = null;
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, password, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[dashboard] database error:", profileError);
  }

  profile = profileData;

  // Auto-create profile row if missing
  if (!profile && user) {
    console.log("[dashboard] Profile row missing, auto-creating...");
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert([
        {
          id: user.id,
          email: user.email ?? "",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("[dashboard] failed to auto-create profile:", insertError.message);
    } else {
      profile = newProfile;
    }
  }

  // Check if the user's profile has a username and a picture (avatar_url)
  const hasUsername = !!(profile?.username);
  const hasPicture = !!(profile?.avatar_url);
  const isProfileComplete = hasUsername && hasPicture;

  if (isProfileComplete) {
    redirect("/collections");
  }

  // Fetch collections to resolve variable reference in dashboard layout
  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Navigation bar, always visible */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
        {/* Main Dashboard layout */}
        <div className="space-y-8 py-4">
          {/* Top Welcome Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile.username || "Profile"}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-violet-500/25"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Welcome back, <span className="gradient-text">{profile?.username || "User"}</span>
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Manage your account and view collections uploaded by our administrators.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/collections"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold text-white shadow-md shadow-violet-500/15 transition-all duration-200 active:scale-95"
              >
                Browse Collections
              </Link>
              <Link
                href="/cart"
                className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                View Cart
              </Link>
            </div>
          </div>

          {/* Admin Uploaded Collections Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-5 bg-violet-600 rounded-sm" />
              Featured Collections
            </h2>
            
            {collections && collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((col: Collection) => (
                  <Link
                    key={col.id}
                    href={`/collections/${col.id}`}
                    className="group flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-violet-500/5"
                  >
                    {/* Collection Image */}
                    <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                      {col.image_url ? (
                        <img
                          src={col.image_url}
                          alt={col.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                          No Image Available
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                          {col.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {col.description || "Explore curated premium items in this catalog."}
                      </p>
                      <span className="text-xs font-semibold text-violet-400 group-hover:text-violet-300 transition-colors flex items-center gap-1.5">
                        View Products
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/10 p-12">
                <svg className="w-10 h-10 text-zinc-600 mx-auto mb-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-semibold text-zinc-400">No collections uploaded yet</p>
                <p className="text-xs text-zinc-600 mt-1">Please log in as Administrator to add collections.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
