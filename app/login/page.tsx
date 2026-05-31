"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  async function handleLogin(identifier: string, password: string) {
    const email = identifier.trim();
    console.log("[login] Attempting login for:", email);

    const adminRes = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (adminRes.ok) {
      console.log("[login] Admin credentials → /admin");
      await supabase.auth.signOut();
      router.push("/admin");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[login] user auth error:", error.message);
      throw new Error(error.message);
    }

    const userId = data.user?.id;
    console.log("[login] User signed in:", userId);

    if (!userId) {
      router.push("/continue-login");
      router.refresh();
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.username && profile?.avatar_url) {
      router.push("/collections");
    } else {
      router.push("/continue-login");
    }
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 bg-zinc-950">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

      {message && (
        <div className="mb-6 max-w-md w-full rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 text-center text-xs text-violet-300 backdrop-blur-sm">
          {message}
        </div>
      )}
      <AuthForm
        title="Log in"
        submitLabel="Log in"
        alternateHref="/signup"
        alternateLabel="Need an account? Sign up"
        onSubmit={handleLogin}
        identifierLabel="Email or admin username"
        identifierType="text"
        identifierAutoComplete="username"
      />
      <Link
        href="/forgot-password"
        className="mt-4 text-sm text-zinc-500 hover:text-violet-400 transition-colors"
      >
        Forgot password or email?
      </Link>
      <p className="mt-3 text-xs text-zinc-600 text-center max-w-sm">
        Use <span className="text-zinc-400">admin</span> / <span className="text-zinc-400">admin</span> for
        the admin portal, or your user email for the store.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
