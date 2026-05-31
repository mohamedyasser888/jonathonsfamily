/** Turn uploaded file name into a readable product label */
export function productNameFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return base || "Item";
}

export function productNameFromImageUrl(url: string): string {
  try {
    const segment = new URL(url).pathname.split("/").pop() || "";
    return productNameFromFileName(decodeURIComponent(segment));
  } catch {
    return "Item";
  }
}

export type ImageItem = { url: string; name: string };

export function parseCollectionImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((u) => typeof u === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
