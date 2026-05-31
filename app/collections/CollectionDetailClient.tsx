"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Collection, Product } from "@/lib/types/profile";
import CollectionGallery from "./CollectionGallery";
import ProductCard from "./ProductCard";
import CollectionAvailabilityBanner from "@/components/CollectionAvailabilityBanner";
import CollectionAvailabilityDot from "@/components/CollectionAvailabilityDot";

type CollectionDetailClientProps = {
  collectionId: string;
  userId: string;
};

export default function CollectionDetailClient({
  collectionId,
  userId,
}: CollectionDetailClientProps) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    console.log("[collection-detail] Loading", collectionId);

    const [colRes, prodRes] = await Promise.all([
      supabase.from("collections").select("*").eq("id", collectionId).single(),
      supabase
        .from("products")
        .select("*")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: true }),
    ]);

    if (colRes.error) {
      console.error("[collection-detail] collection error:", colRes.error.message);
    } else if (colRes.data) {
      const col = colRes.data as Collection & { published?: boolean };
      if (col.published === false) {
        setCollection(null);
        setLoading(false);
        return;
      }
      setCollection({
        ...col,
        images: Array.isArray(col.images)
          ? col.images
          : typeof col.images === "string"
            ? JSON.parse(col.images)
            : [],
      } as Collection & { images: string[] });
    }

    if (prodRes.error) {
      console.error("[collection-detail] products error:", prodRes.error.message);
    } else {
      setProducts(prodRes.data ?? []);
      console.log("[collection-detail] products:", prodRes.data?.length ?? 0);
    }

    setLoading(false);
  }, [collectionId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`collection-${collectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collectionId, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-20 text-zinc-400">
        Collection not found.{" "}
        <Link href="/collections" className="text-violet-400 underline">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CollectionAvailabilityBanner status={collection.availability_status} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link
            href="/collections"
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 mb-2 inline-block"
          >
            ← All collections
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {collection.name}
            <CollectionAvailabilityDot
              status={collection.availability_status}
              inline
            />
          </h1>
          {collection.description && (
            <p className="text-zinc-400 mt-2 max-w-2xl">{collection.description}</p>
          )}
        </div>
        <Link
          href="/cart"
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white text-center"
        >
          View cart & create ticket
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 text-sm">
          No items in this collection yet.
        </div>
      ) : collection.images && collection.images.length > 0 ? (
        <CollectionGallery
          images={collection.images}
          products={products}
          userId={userId}
          collectionName={collection.name}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
