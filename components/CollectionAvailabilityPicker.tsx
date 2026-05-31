"use client";

import {
  COLLECTION_AVAILABILITY_OPTIONS,
  normalizeCollectionAvailability,
  type CollectionAvailability,
} from "@/lib/collection-availability";

type Props = {
  value?: string | null;
  onChange: (status: CollectionAvailability) => void;
  disabled?: boolean;
};

export default function CollectionAvailabilityPicker({
  value,
  onChange,
  disabled,
}: Props) {
  const current = normalizeCollectionAvailability(value);

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        Store dot
      </p>
      <div className="flex flex-wrap gap-1">
        {COLLECTION_AVAILABILITY_OPTIONS.map((opt) => {
          const selected = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              title={opt.hint}
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[9px] font-semibold transition-colors disabled:opacity-50 ${
                selected
                  ? "border-violet-500/60 bg-violet-950/40 text-white"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 shrink-0 rounded-full ${opt.dotClass}`}
                aria-hidden
              />
              {opt.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
