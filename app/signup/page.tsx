"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { supabase } from "@/lib/supabaseClient";

async function ensureProfile(
  userId: string,
  profileEmail: string,
  profilePassword: string
) {
  console.log("[signup] Ensuring profile row:", { userId, profileEmail });

  const { error: profileError } = await supabase.from("profiles").upsert(
    [
      {
        id: userId,
        email: profileEmail,
        password: profilePassword,
      },
    ],
    { onConflict: "id" }
  );

  if (profileError) {
    console.log("Profile Error:", profileError.message);
    return profileError;
  }

  console.log("Profile created");
  return null;
}

function isAlreadyRegistered(message: string) {
  const m = message.toLowerCase();
  return m.includes("already registered") || m.includes("already been registered");
}

export default function SignupPage() {
  const router = useRouter();

  const handleSignup = async (email: string, password: string) => {
    console.log("[signup] Starting…", { email });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log("Signup Error:", error.message);

      if (isAlreadyRegistered(error.message)) {
        console.log("[signup] Auth user exists — signing in to finish profile…");

        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          console.log("Sign-in Error:", signInError.message);
          throw new Error(
            "This email is already registered. Use Log in with the same password, or delete the user in Supabase → Authentication → Users and try again."
          );
        }

        const user = signInData.user;
        if (!user) {
          throw new Error("Could not sign in. Try the login page.");
        }

        console.log("Auth success (existing user)");

        const profileError = await ensureProfile(
          user.id,
          user.email ?? email,
          password
        );
        if (profileError) {
          throw new Error(profileError.message);
        }

        await supabase.auth.signOut();
        router.push(
          "/login?message=Account already exists. Profile updated — please log in."
        );
        router.refresh();
        return;
      }

      throw new Error(error.message);
    }

    console.log("Auth success");

    if (!data.user) {
      console.log("Signup Error: No user returned from auth");
      throw new Error("Sign up failed. Please try again.");
    }

    console.log("[signup] Auth user id:", data.user.id);

    const profileError = await ensureProfile(
      data.user.id,
      data.user.email ?? email,
      password
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (data.session) {
      console.log("[signup] Session active → login");
      await supabase.auth.signOut();
      router.push("/login?message=Account created successfully. Please log in.");
      router.refresh();
    } else {
      console.log("[signup] Confirm email → login");
      router.push(
        "/login?message=Account created. Confirm your email, then log in."
      );
      router.refresh();
    }
  };

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 bg-zinc-950">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

      <AuthForm
        title="Create account"
        submitLabel="Sign up"
        alternateHref="/login"
        alternateLabel="Already have an account? Log in"
        onSubmit={handleSignup}
        showConfirmPassword={true}
      />
    </div>
  );
}
