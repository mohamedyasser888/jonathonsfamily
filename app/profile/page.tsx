import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import SignOutButton from "@/app/dashboard/SignOutButton";
import ProfileForm from "@/app/dashboard/ProfileForm";
import Navbar from "@/components/Navbar";
import type { Profile } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ProfilePage(props: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabaseClient();
  const searchParams = await props.searchParams;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("[profile] auth error:", userError);
  }

  if (!user) {
    console.log("[profile] No session, redirecting to login");
    redirect("/login");
  }

  let profile = null;
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, password, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    console.error("[profile] database error:", profileError);
  }

  profile = profileData;

  // Auto-create profile row if missing
  if (!profile && user) {
    console.log("[profile] Profile row missing, auto-creating...");
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
      console.error("[profile] failed to auto-create profile:", insertError.message);
    } else {
      profile = newProfile;
    }
  }

  const isProfileIncomplete = !profile?.username || !profile?.avatar_url;
  const isEditing = isProfileIncomplete || searchParams.edit === "true";

  const initial = profile?.username ? profile.username.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top Header */}
      <Navbar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl animate-fade-in">
          {/* Welcome Message */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 p-6">
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? "Complete Your Profile" : "Welcome to Jonathon"}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {isEditing
                ? "Please set your username and profile picture to complete your profile."
                : `Hello, ${profile?.username || "User"}! 👋 Manage your personal settings here.`}
            </p>
          </div>

          {isEditing ? (
            <div className="space-y-6">
              {profile && <ProfileForm profile={profile} userId={user.id} />}
              
              {!isProfileIncomplete && (
                <div className="mt-4 pt-4 border-t border-zinc-850 flex justify-end">
                  <Link
                    href="/profile"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* Profile Card (Static View) */
            <div className="space-y-8">
              {/* Photo */}
              <div className="flex justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username || "Avatar"}
                    className="h-36 w-36 rounded-2xl object-cover ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/10"
                  />
                ) : (
                  <div className="h-36 w-36 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-4xl font-black text-white ring-2 ring-violet-500/30">
                    {initial}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="border-t border-zinc-800/60 pt-6">
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Username
                    </dt>
                    <dd className="mt-1 text-base font-bold text-zinc-100">
                      {profile?.username || "—"}
                    </dd>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Email Address
                    </dt>
                    <dd className="mt-1 text-base text-zinc-300">
                      {profile?.email || ""}
                    </dd>
                  </div>

                  <div className="sm:col-span-2 bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      User Account ID
                    </dt>
                    <dd className="mt-1 break-all font-mono text-xs text-zinc-400">
                      {profile?.id || ""}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Actions */}
              <div className="mt-8 pt-6 border-t border-zinc-800/60 flex flex-wrap gap-3 justify-end">
                <Link
                  href="/profile?edit=true"
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/collections"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-md shadow-violet-500/10"
                >
                  Browse Collections
                </Link>
                <SignOutButton />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
