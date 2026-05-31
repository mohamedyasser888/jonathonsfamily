"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/types/profile";
import PriceDisplay from "@/components/PriceDisplay";

type ProductCardProps = {
  product: Product;
  userId: string;
};

export default function ProductCard({ product, userId }: ProductCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleAddToCart() {
    setLoading(true);
    try {
      const { data: existingItem, error: fetchError } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        const { error: updateError } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("cart").insert({
          user_id: userId,
          product_id: product.id,
          quantity: 1,
        });
        if (insertError) throw insertError;
      }

      toast(`"${product.name}" added to cart!`, "success");
    } catch (err) {
      console.error("[ProductCard] cart error:", err);
      toast("Failed to add to cart.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group h-full border border-zinc-800/80">
      <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
            No image
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-bold text-white line-clamp-2">{product.name}</h3>
        <p className="text-lg font-black text-violet-400">
          <PriceDisplay price={product.price} />
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loading}
          className="mt-auto w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
