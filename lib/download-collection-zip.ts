import JSZip from "jszip";
import { parseCollectionImages } from "@/lib/collection-folder";

export type CollectionDownloadMeta = {
  name: string;
  description?: string | null;
  images: string[];
  created_at?: string;
};

function safeSlug(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "collection"
  );
}

function fileNameFromUrl(url: string, index: number): string {
  try {
    const segment = decodeURIComponent(new URL(url).pathname.split("/").pop() || "");
    if (segment && segment.includes(".")) return segment;
    if (segment) return `${segment}.png`;
  } catch {
    /* ignore */
  }
  return `photo-${String(index + 1).padStart(2, "0")}.png`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch image`);
  return res.blob();
}

/** Zip with image files only (flat). */
export async function downloadPicturesZip(
  meta: CollectionDownloadMeta,
  onProgress?: (msg: string) => void
): Promise<void> {
  const urls = meta.images.filter(Boolean);
  if (urls.length === 0) throw new Error("No pictures to download");

  const zip = new JSZip();
  const slug = safeSlug(meta.name);

  for (let i = 0; i < urls.length; i++) {
    onProgress?.(`Adding picture ${i + 1} / ${urls.length}…`);
    const blob = await fetchImageBlob(urls[i]);
    zip.file(fileNameFromUrl(urls[i], i), blob);
  }

  onProgress?.("Building ZIP…");
  const content = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(content, `${slug}-pictures.zip`);
}

/** Zip with folder + info file + photos subfolder. */
export async function downloadCollectionZip(
  meta: CollectionDownloadMeta,
  onProgress?: (msg: string) => void
): Promise<void> {
  const urls = meta.images.filter(Boolean);
  if (urls.length === 0) throw new Error("No pictures to download");

  const slug = safeSlug(meta.name);
  const zip = new JSZip();
  const root = zip.folder(slug);
  if (!root) throw new Error("Could not create ZIP folder");

  const info = [
    `Collection: ${meta.name}`,
    meta.description ? `Description: ${meta.description}` : "",
    `Photos: ${urls.length}`,
    meta.created_at ? `Created: ${new Date(meta.created_at).toLocaleString()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  root.file("collection-info.txt", info);

  const photos = root.folder("photos");
  if (!photos) throw new Error("Could not create photos folder");

  for (let i = 0; i < urls.length; i++) {
    onProgress?.(`Adding picture ${i + 1} / ${urls.length}…`);
    const blob = await fetchImageBlob(urls[i]);
    photos.file(fileNameFromUrl(urls[i], i), blob);
  }

  onProgress?.("Building ZIP…");
  const content = await zip.generateAsync({ type: "blob" });
  triggerBlobDownload(content, `${slug}-collection.zip`);
}

export function imagesFromCollection(col: {
  images?: unknown;
  image_url?: string | null;
}): string[] {
  const urls = parseCollectionImages(col.images);
  if (urls.length > 0) return urls;
  if (col.image_url) return [col.image_url];
  return [];
}
