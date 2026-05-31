/** Extensions treated as images in the admin portal (upload + folder pick). */
export const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "png",
  "gif",
  "webp",
  "bmp",
  "dib",
  "tif",
  "tiff",
  "svg",
  "svgz",
  "ico",
  "cur",
  "avif",
  "heic",
  "heif",
  "hif",
  "apng",
  "jxl",
  "pjpeg",
  "pjp",
]);

/** Use on file inputs so OS pickers include HEIC, TIFF, BMP, etc. */
export const IMAGE_FILE_ACCEPT =
  "image/*,.jpg,.jpeg,.jpe,.jfif,.png,.gif,.webp,.bmp,.dib,.tif,.tiff,.svg,.svgz,.ico,.avif,.heic,.heif,.hif,.apng,.jxl,.pjpeg,.pjp";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  pjp: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  dib: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  ico: "image/x-icon",
  cur: "image/x-icon",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  hif: "image/heif",
  apng: "image/apng",
  jxl: "image/jxl",
};

export function imageExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

const EXTRA_IMAGE_MIMES = new Set(["image/x-png", "image/pjpeg", "image/x-icon"]);

export function isImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/") || EXTRA_IMAGE_MIMES.has(type)) return true;
  return IMAGE_EXTENSIONS.has(imageExtension(file.name));
}

export function contentTypeForUpload(file: File): string {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/") && type !== "application/octet-stream") {
    return type;
  }
  const ext = imageExtension(file.name);
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function filterImageFiles(files: FileList | File[] | null): File[] {
  return Array.from(files || []).filter(isImageFile);
}
