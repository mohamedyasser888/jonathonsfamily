"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import type { Product } from "@/lib/types/profile";
import PriceDisplay from "@/components/PriceDisplay";

type CollectionGalleryProps = {
  images: string[];
  products: Product[];
  userId: string;
  collectionName: string;
};

export default function CollectionGallery({
  images,
  products,
  userId,
  collectionName,
}: CollectionGalleryProps) {
  const { toast } = useToast();
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const productByUrl = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p.image_url) map.set(p.image_url, p);
    }
    return map;
  }, [products]);

  // Filter out invalid image URLs and failed loads
  const validImages = useMemo(() => {
    return images.filter(url => {
      if (!url || typeof url !== 'string') return false;
      if (failedImages.has(url)) return false;
      // Check if it looks like a URL
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
    });
  }, [images, failedImages]);

  const handleImageError = (url: string) => {
    console.error(`[gallery] Failed to load image:`, url);
    setFailedImages(prev => new Set(prev).add(url));
  };

  async function addToCart(product: Product) {
    setLoadingUrl(product.image_url);
    try {
      const { data: existingItem, error: fetchError } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart").insert({
          user_id: userId,
          product_id: product.id,
          quantity: 1,
        });
        if (error) throw error;
      }
      toast(`"${product.name}" added to cart!`, "success");
    } catch (err) {
      console.error("[gallery] cart", err);
      toast("Failed to add to cart.", "error");
    } finally {
      setLoadingUrl(null);
    }
  }

  if (validImages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 text-sm">
        No photos in this collection yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        <span className="font-semibold text-white">{validImages.length}</span>{" "}
        {validImages.length === 1 ? "photo" : "photos"} in{" "}
        <span className="text-violet-400">{collectionName}</span>
        {failedImages.size > 0 && (
          <span className="text-zinc-600 ml-2">({failedImages.size} failed to load)</span>
        )}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {validImages.map((url, index) => {
          const product = productByUrl.get(url);
          return (
            <div
              key={url}
              className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
            >
              <div className="aspect-square w-full bg-zinc-950 p-2">
                <img
                  src={url}
                  alt={`${collectionName} ${index + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={() => handleImageError(url)}
                  crossOrigin="anonymous"
                />
              </div>
              {product ? (
                <div className="p-4 flex flex-col gap-2 border-t border-zinc-900">
                  <p className="text-xs font-bold text-white truncate">{product.name}</p>
                  <p className="text-sm font-black text-violet-400">
                    <PriceDisplay price={product.price} />
                  </p>
                  <button
                    type="button"
                    disabled={loadingUrl === url}
                    onClick={() => addToCart(product)}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {loadingUrl === url ? "Adding…" : "Add to Cart"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
