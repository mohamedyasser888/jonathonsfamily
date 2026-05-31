"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/types/profile";

export default function UserHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfileAndCart() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Load profile with avatar_url
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, username, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData as Profile);
        }

        // Get cart item count
        const { count, error: cartError } = await supabase
          .from("cart")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!cartError && count !== null) {
          setCartCount(count);
        }

        // Listen for realtime cart updates
        const cartChannel = supabase
          .channel("cart-changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "cart", filter: `user_id=eq.${user.id}` },
            async () => {
              const { count: newCount } = await supabase
                .from("cart")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id);
              if (newCount !== null) {
                setCartCount(newCount);
              }
            }
          )
          .subscribe();

        // Return cleanup function from useEffect
        return () => {
          supabase.removeChannel(cartChannel);
        };
      } catch (error) {
        console.error("Error loading profile or cart:", error);
        setLoading(false);
      }
    }

    const cleanup = loadProfileAndCart();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  if (loading || !profile) {
    return null;
  }

  const initial = profile.username ? profile.username.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex items-center gap-4">
      {/* Cart Icon Link */}
      <Link
        href="/cart"
        className="relative p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-white transition-all active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white ring-2 ring-zinc-950 animate-pulse">
            {cartCount}
          </span>
        )}
      </Link>

      {/* User Profile Info Link */}
      <Link
        href="/profile"
        className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 px-3.5 py-1.5 transition-all duration-200"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username || "Avatar"}
            className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            {initial}
          </div>
        )}
        <span className="text-sm font-semibold text-zinc-200 hover:text-white inline-block">
          {profile.username || "Complete Profile"}
        </span>
      </Link>
    </div>
  );
}
