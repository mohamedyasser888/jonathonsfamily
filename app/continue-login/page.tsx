import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProfileForm from "@/app/dashboard/ProfileForm";
import SignOutButton from "@/app/dashboard/SignOutButton";
import type { Profile } from "@/lib/types/profile";

export const dynamic = "force-dynamic";

export default async function ContinueLoginPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log("[continue-login] No user session found, redirecting to login");
    redirect("/login");
  }

  let profile = null;
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, username, password, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    console.error("[continue-login] profile database error:", profileError);
  }

  profile = profileData;

  // Auto-create profile row if missing in database
  if (!profile && user) {
    console.log("[continue-login] Profile row missing, auto-creating...");
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
      console.error("[continue-login] failed to auto-create profile:", insertError.message);
    } else {
      profile = newProfile;
    }
  }

  // Check if profile is complete
  const isProfileComplete = !!profile?.username && !!profile?.avatar_url;

  // If complete, redirect straight to the store/market page
  if (isProfileComplete) {
    redirect("/collections");
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 bg-zinc-950">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl p-8 shadow-2xl z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-600/10 text-violet-400 mb-3 border border-violet-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Continue Logging In</h1>
          <p className="mt-1.5 text-xs text-zinc-400">
            You need to configure your username and profile picture to access the store.
          </p>
        </div>

        {profile && <ProfileForm profile={profile} userId={user.id} />}

        <div className="mt-6 pt-4 border-t border-zinc-800/60 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
