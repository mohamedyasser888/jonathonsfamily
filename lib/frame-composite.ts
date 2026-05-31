/**
 * Client-side: composite transparent PNG photo + transparent PNG frame → PNG (no fill).
 * Layer order: photo (contain in safe area) → frame on top.
 */

export type FrameInsets = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

/**
 * Safe area for the product photo (ratios 0–1).
 * Keeps clear of blue border, corner filigree, and bottom Jonathon logo.
 */
export const JONATHON_FRAME_INSETS: FrameInsets = {
  top: 0.088,
  left: 0.072,
  right: 0.072,
  bottom: 0.148,
};

/** Scale photo up within the safe area; clipping prevents overlap with border/logo. */
const PHOTO_SIZE_BOOST = 1.14;

export const FRAME_ASSET_PATH = "/frames/jonathon-frame.png";

export function loadImageElement(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    if (typeof src === "string") {
      img.src = src;
    } else {
      img.src = URL.createObjectURL(src);
    }
  });
}

/** Keep Jonathon blue border, filigree, and logo — drop starfield / black fill. */
function isFrameOrLogoPixel(r: number, g: number, b: number): boolean {
  if (b >= 45 && b > r + 15 && b > g + 8) return true;
  if (r > 185 && g > 185 && b > 185) return true;
  if (r > 150 && g > 120 && b < 150 && r >= g - 20) return true;
  if (b > 70 && r < 110 && g < 130 && b > r + 10) return true;
  return false;
}

function stripStarfieldFromFrame(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] < 8) continue;
    if (isFrameOrLogoPixel(r, g, b)) continue;

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;

    if (lum < 75 || (lum > 110 && chroma < 75) || (lum < 130 && chroma < 45)) {
      data[i + 3] = 0;
    }
  }
}

/**
 * Frame asset may include a preview starfield — remove it so only border + logo remain.
 */
export async function prepareFrameOverlay(
  frameSrc: string | HTMLImageElement
): Promise<HTMLImageElement> {
  const frame =
    typeof frameSrc === "string" ? await loadImageElement(frameSrc) : frameSrc;
  const w = frame.naturalWidth;
  const h = frame.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas not supported");

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(frame, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  stripStarfieldFromFrame(imageData.data);
  ctx.putImageData(imageData, 0, 0);

  return loadImageElement(canvas.toDataURL("image/png"));
}

export function compositePhotoInFrame(
  photo: HTMLImageElement,
  frameOverlay: HTMLImageElement,
  insets: FrameInsets = JONATHON_FRAME_INSETS
): HTMLCanvasElement {
  const w = frameOverlay.naturalWidth;
  const h = frameOverlay.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Canvas not supported");

  ctx.clearRect(0, 0, w, h);

  const il = insets.left * w;
  const it = insets.top * h;
  const innerW = w - insets.left * w - insets.right * w;
  const innerH = h - insets.top * h - insets.bottom * h;

  const baseScale = Math.min(
    innerW / photo.naturalWidth,
    innerH / photo.naturalHeight
  );
  const scale = baseScale * PHOTO_SIZE_BOOST;
  const dw = photo.naturalWidth * scale;
  const dh = photo.naturalHeight * scale;
  const dx = il + (innerW - dw) / 2;
  const dy = it + (innerH - dh) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(il, it, innerW, innerH);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();

  ctx.drawImage(frameOverlay, 0, 0, w, h);

  return canvas;
}

export async function canvasToPngFile(
  canvas: HTMLCanvasElement,
  fileName: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export image"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/png" }));
      },
      "image/png"
    );
  });
}
