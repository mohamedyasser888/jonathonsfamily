"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Collection } from "@/lib/types/profile";
import CollectionAvailabilityDot from "@/components/CollectionAvailabilityDot";

export default function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    console.log("[collections] Loading from database…");
    const { data, error: fetchError } = await supabase
      .from("collections")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("[collections] fetch error:", fetchError.message);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const parsed = (data ?? []).map((col) => {
      let images: string[] = [];
      if (Array.isArray(col.images)) images = col.images;
      else if (typeof col.images === "string") {
        try {
          images = JSON.parse(col.images);
        } catch {
          images = [];
        }
      }
      return { ...col, images } as Collection;
    });

    console.log("[collections] Loaded", parsed.length, "collections");
    setCollections(parsed);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCollections();

    const channel = supabase
      .channel("collections-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collections" },
        (payload) => {
          console.log("[collections] realtime collections:", payload.eventType);
          loadCollections();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("[collections] realtime products:", payload.eventType);
          loadCollections();
        }
      )
      .subscribe();

    const poll = setInterval(loadCollections, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [loadCollections]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-2 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center text-rose-300 text-sm">
        Could not load collections: {error}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center rounded-2xl border border-dashed border-zinc-800 py-20">
        <p className="text-zinc-400 font-medium">No collections yet</p>
        <p className="text-sm text-zinc-600 mt-2">
          Admin uploads appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.id}`}
          className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden hover:border-violet-500/40 transition-all hover:-translate-y-1"
        >
          <div className="aspect-video bg-zinc-950 relative overflow-hidden">
            <CollectionAvailabilityDot status={col.availability_status} />
            {col.image_url ? (
              <img
                src={col.image_url}
                alt={col.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                No cover image
              </div>
            )}
          </div>
          <div className="p-5">
            <h2 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
              {col.name}
            </h2>
            {col.description && (
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{col.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {col.images && col.images.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {col.images.length} {col.images.length === 1 ? "photo" : "photos"}
                </span>
              )}
              <span className="text-xs font-semibold text-violet-400">
                Open collection →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
