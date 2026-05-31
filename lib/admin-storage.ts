import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "jonathon-images";

/** Path inside bucket from a public Supabase storage URL. */
export function storagePathFromPublicUrl(url: string): string | null {
  if (!url?.trim()) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

export async function deleteStorageObjects(
  supabase: SupabaseClient,
  urls: string[]
): Promise<void> {
  const paths = [
    ...new Set(
      urls.map(storagePathFromPublicUrl).filter((p): p is string => Boolean(p))
    ),
  ];
  if (paths.length === 0) return;

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn("[admin-storage] remove failed:", error.message);
  }
}
