"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/types/profile";

interface ProductCardProps {
  product: Product;
  userId: string;
}

export default function ProductCard({ product, userId }: ProductCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleAddToCart() {
    setLoading(true);
    try {
      // Check if product already exists in user's cart
      const { data: existingItem, error: fetchError } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        // Increment quantity
        const { error: updateError } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Insert new cart item
        const { error: insertError } = await supabase
          .from("cart")
          .insert({
            user_id: userId,
            product_id: product.id,
            quantity: 1,
          });

        if (insertError) throw insertError;
      }

      toast(`"${product.name}" added to cart!`, "success");
    } catch (err) {
      console.error("Cart operation failed:", err);
      toast("Failed to add product to cart. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group h-full">
      {/* Product Image Container */}
      <div className="relative aspect-square w-full bg-zinc-950 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
            No Image
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent" />
      </div>

      {/* Product Information */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-100 group-hover:text-violet-400 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-zinc-500 line-clamp-2 mt-1 min-h-[2rem]">
            {product.description || "Exclusive product item curated specifically for you."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-400">Price</span>
            <span className="text-lg font-black text-white">
              ${Number(product.price).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-2.5 text-xs font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
