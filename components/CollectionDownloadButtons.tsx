"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import {
  downloadCollectionZip,
  downloadPicturesZip,
  imagesFromCollection,
  type CollectionDownloadMeta,
} from "@/lib/download-collection-zip";

type CollectionDownloadButtonsProps = {
  name: string;
  description?: string | null;
  images?: unknown;
  image_url?: string | null;
  created_at?: string;
  disabled?: boolean;
  layout?: "row" | "stack";
};

export default function CollectionDownloadButtons({
  name,
  description,
  images,
  image_url,
  created_at,
  disabled = false,
  layout = "row",
}: CollectionDownloadButtonsProps) {
  const [loading, setLoading] = useState<"pictures" | "collection" | null>(null);
  const { toast } = useToast();

  const meta: CollectionDownloadMeta = {
    name,
    description,
    images: imagesFromCollection({ images, image_url }),
    created_at,
  };

  const count = meta.images.length;
  const isDisabled = disabled || loading !== null || count === 0;

  async function runDownload(
    kind: "pictures" | "collection",
    fn: (m: CollectionDownloadMeta) => Promise<void>
  ) {
    if (count === 0) {
      toast("No pictures in this collection", "info");
      return;
    }
    setLoading(kind);
    try {
      await fn(meta);
      toast(
        kind === "pictures"
          ? `Downloaded ${count} picture(s)`
          : `Downloaded collection folder (${count} photos)`,
        "success"
      );
    } catch (err) {
      console.error("[download]", err);
      toast(err instanceof Error ? err.message : "Download failed", "error");
    } finally {
      setLoading(null);
    }
  }

  const wrapClass =
    layout === "stack" ? "flex flex-col gap-2 w-full" : "flex flex-wrap gap-2";

  return (
    <div className={wrapClass}>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => runDownload("pictures", downloadPicturesZip)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading === "pictures" ? "Downloading…" : "Pictures only"}
      </button>
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => runDownload("collection", downloadCollectionZip)}
        className="rounded-lg border border-violet-500/30 bg-violet-950/30 px-3 py-2 text-[10px] font-bold text-violet-200 hover:bg-violet-950/50 disabled:opacity-50"
      >
        {loading === "collection" ? "Downloading…" : "Collection + pictures"}
      </button>
    </div>
  );
}
