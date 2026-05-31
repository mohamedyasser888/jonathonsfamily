"use client";

import { useState } from "react";

type AdminImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Shown when the browser cannot decode the format (e.g. some HEIC files). */
  fallbackLabel?: string;
};

export default function AdminImage({
  src,
  alt,
  className = "",
  fallbackLabel = "Image",
}: AdminImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src?.trim() || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-zinc-900 text-zinc-500 ${className}`}
      >
        <span className="text-lg opacity-40">🖼</span>
        <span className="text-[9px] uppercase tracking-wide px-1 text-center">
          {failed ? "Preview not supported in browser" : "No image"}
        </span>
        {failed && alt && (
          <span className="text-[8px] text-zinc-600 truncate max-w-full px-2">
            {fallbackLabel || alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
