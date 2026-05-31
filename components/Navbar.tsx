"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserHeader from "./UserHeader";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[navbar] signOut error:", error.message);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/collections", label: "Collections" },
    { href: "/market", label: "Market" },
    { href: "/cart", label: "Cart" },
    { href: "/tickets", label: "My Tickets" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/collections" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600">
              <span className="text-sm font-black text-white">J</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Jonathon</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-900 text-white border border-zinc-800"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <UserHeader />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 active:scale-95 transition-all"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="flex md:hidden border-t border-zinc-900 px-4 py-2 justify-around">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-semibold ${isActive ? "text-violet-400" : "text-zinc-500"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
