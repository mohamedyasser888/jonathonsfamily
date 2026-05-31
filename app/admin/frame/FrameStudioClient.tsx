"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { filterImageFiles } from "@/lib/image-files";
import { MAGICAL_PRICE_HINT, parseMagicalPrice } from "@/lib/magical-price";
import type { Collection } from "@/lib/types/profile";
import {
  canvasToPngFile,
  compositePhotoInFrame,
  FRAME_ASSET_PATH,
  prepareFrameOverlay,
  loadImageElement,
} from "@/lib/frame-composite";
import AdminImage from "@/components/AdminImage";
import CollectionDownloadButtons from "@/components/CollectionDownloadButtons";

function framedFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "item";
  return `${base}-framed.png`;
}

type DraftCollection = Collection & {
  published?: boolean;
  images?: string[] | null;
};

export default function FrameStudioClient() {
  const [collectionName, setCollectionName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("k");
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftCollection[]>([]);
  const [lastUploaded, setLastUploaded] = useState<DraftCollection | null>(null);
  const { toast } = useToast();

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/collections", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as DraftCollection[];
      const pending = data.filter((c) => c.published === false);
      setDrafts(pending);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const onFolderPick = useCallback(
    (fileList: FileList | null) => {
      const images = filterImageFiles(fileList);
      setFolderFiles(images);
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return images.slice(0, 6).map((f) => URL.createObjectURL(f));
      });
      if (images.length > 0) {
        toast(`Selected ${images.length} image(s) for framing`, "success");
      } else if (fileList?.length) {
        toast("No images found in folder", "error");
      }
    },
    [toast]
  );

  async function uploadFramedFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  }

  async function handleUpload() {
    if (!collectionName.trim()) {
      toast("Enter a collection name", "info");
      return;
    }
    if (folderFiles.length === 0) {
      toast("Select a folder of images first", "info");
      return;
    }
    const priceParsed = parseMagicalPrice(defaultPrice);
    if (!priceParsed.valid) {
      toast(priceParsed.error, "error");
      return;
    }

    setLoading(true);
    setProgress("Loading frame…");
    setLastUploaded(null);

    try {
      const frameOverlay = await prepareFrameOverlay(FRAME_ASSET_PATH);
      const urls: string[] = [];
      const names: string[] = [];

      for (let i = 0; i < folderFiles.length; i++) {
        const file = folderFiles[i];

        setProgress(`Framing ${i + 1} / ${folderFiles.length}: ${file.name}`);
        const photo = await loadImageElement(file);
        const canvas = compositePhotoInFrame(photo, frameOverlay);
        const framedFile = await canvasToPngFile(
          canvas,
          framedFileName(file.name)
        );
        if (photo.src.startsWith("blob:")) {
          URL.revokeObjectURL(photo.src);
        }

        setProgress(`Uploading ${i + 1} / ${folderFiles.length}…`);
        const url = await uploadFramedFile(framedFile);
        urls.push(url);
        names.push(file.name);
      }

      setProgress("Saving collection (draft)…");
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectionName.trim(),
          description: `Framed gallery — ${folderFiles.length} photos`,
          image_url: urls[0] || null,
          images: urls,
          image_names: names,
          default_price: priceParsed.storage,
          gallery_only: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create collection");

      const uploaded = data as DraftCollection;
      setLastUploaded(uploaded);
      toast(
        `"${collectionName.trim()}" uploaded as draft — publish when ready.`,
        "success"
      );
      setCollectionName("");
      setFolderFiles([]);
      setPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      await loadDrafts();
    } catch (err) {
      console.error("[frame-studio]", err);
      toast(err instanceof Error ? err.message : "Failed", "error");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function handlePublish(collectionId: string, name: string) {
    setPublishingId(collectionId);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      toast(`"${name}" is live — users can see it now.`, "success");
      if (lastUploaded?.id === collectionId) setLastUploaded(null);
      await loadDrafts();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Publish failed", "error");
    } finally {
      setPublishingId(null);
    }
  }

  function imageCount(col: DraftCollection): number {
    if (Array.isArray(col.images)) return col.images.length;
    return col.image_url ? 1 : 0;
  }

  return (
    <div className="py-8 space-y-8 max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-xs text-zinc-500 hover:text-violet-400 transition-colors"
          >
            ← Back to admin
          </Link>
          <h1 className="text-2xl font-black text-white mt-2">Frame Studio</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Use transparent PNG photos and the frame overlay — output stays PNG with
            no solid background (product behind the frame border).
          </p>
        </div>
        <div className="w-20 h-20 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
          <AdminImage
            src={FRAME_ASSET_PATH}
            alt="Frame preview"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-zinc-800 p-6 space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-zinc-400">
            Collection name *
          </label>
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="e.g. Spring bags"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-zinc-400">
            Default price per item
          </label>
          <input
            type="text"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            placeholder="8g, 5s, 20k"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
          />
          <p className="text-[10px] text-zinc-600">{MAGICAL_PRICE_HINT}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-zinc-400">
            Folder of pictures *
          </label>
          <input
            type="file"
            multiple
            // @ts-expect-error folder picker
            webkitdirectory=""
            directory=""
            disabled={loading}
            onChange={(e) => {
              onFolderPick(e.target.files);
              e.target.value = "";
            }}
            className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:text-zinc-200 cursor-pointer"
          />
          <p className="text-[10px] text-zinc-600">
            {folderFiles.length > 0
              ? `${folderFiles.length} image(s) ready to frame and upload.`
              : "Pick a folder. PNG, JPG, WebP, etc."}
          </p>
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div
                key={src}
                className="aspect-square rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950"
              >
                <img
                  src={src}
                  alt={`Source ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {progress && (
          <p className="text-xs text-violet-400 text-center animate-pulse">{progress}</p>
        )}

        <button
          type="button"
          disabled={loading || !collectionName.trim() || folderFiles.length === 0}
          onClick={handleUpload}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 py-3.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Upload framed collection"
          )}
        </button>
        <p className="text-[10px] text-zinc-600 text-center">
          Upload saves as draft only — users cannot see it until you publish.
        </p>
      </div>

      {lastUploaded && lastUploaded.published === false && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
          <p className="text-sm font-bold text-emerald-300">Just uploaded</p>
          <p className="text-xs text-zinc-400">
            <span className="text-white font-semibold">{lastUploaded.name}</span>{" "}
            is ready. Publish it to show on the user store.
          </p>
          <button
            type="button"
            disabled={publishingId === lastUploaded.id}
            onClick={() => handlePublish(lastUploaded.id, lastUploaded.name)}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {publishingId === lastUploaded.id ? "Publishing…" : "Publish to store"}
          </button>
          <CollectionDownloadButtons
            layout="stack"
            name={lastUploaded.name}
            description={lastUploaded.description}
            images={lastUploaded.images}
            image_url={lastUploaded.image_url}
            created_at={lastUploaded.created_at}
          />
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Draft framed collections ({drafts.length})
          </h2>
          <div className="space-y-3">
            {drafts.map((col) => (
              <div
                key={col.id}
                className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                  {col.image_url ? (
                    <AdminImage
                      src={col.image_url}
                      alt={col.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-950" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{col.name}</p>
                  <p className="text-[10px] text-amber-400 font-semibold uppercase mt-0.5">
                    Draft · not visible to users
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {imageCount(col)} photo(s)
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto sm:min-w-[140px]">
                  <button
                    type="button"
                    disabled={publishingId === col.id}
                    onClick={() => handlePublish(col.id, col.name)}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {publishingId === col.id ? "…" : "Publish"}
                  </button>
                  <CollectionDownloadButtons
                    layout="stack"
                    name={col.name}
                    description={col.description}
                    images={col.images}
                    image_url={col.image_url}
                    created_at={col.created_at}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
