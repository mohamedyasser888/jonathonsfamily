"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";

type MarketClientProps = {
  userId: string;
  username: string;
};

export default function MarketClient({ userId, username }: MarketClientProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 3) {
      toast("Please describe what you are looking for (at least 3 characters).", "info");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        user_id: userId,
        username: username || "User",
        items: [
          {
            kind: "market",
            name: "Market request",
            quantity: 1,
            price: 0,
            price_label: "—",
            collection_name: "Market",
            request_text: text,
          },
        ],
        total_items: 1,
        status: "pending",
      });

      if (error) throw new Error(error.message);

      toast("Your request was sent to Jonathon!", "success");
      setMessage("");
      router.push("/tickets");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit request";
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 sm:py-12 flex flex-col">
      <header className="text-center space-y-4 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
          Market
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug px-2">
          Looking for something unique?
        </h1>
        <p className="text-base sm:text-lg text-zinc-300 font-medium leading-relaxed px-1">
          Jonathon is your way to get it.
        </p>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Tell us what you want below. Your message becomes a ticket for our team —
          just like an order from the cart.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6 shadow-xl shadow-black/20"
      >
        <label
          htmlFor="market-request"
          className="text-[11px] font-bold uppercase tracking-wider text-zinc-400"
        >
          Your request
        </label>
        <textarea
          id="market-request"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what you are looking for…"
          rows={6}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 min-h-[140px]"
        />
        <p className="text-[11px] text-zinc-600 text-center">
          {message.trim().length} characters
        </p>

        <button
          type="submit"
          disabled={loading || message.trim().length < 3}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3.5 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Submit to Jonathon"
          )}
        </button>
      </form>
    </main>
  );
}
