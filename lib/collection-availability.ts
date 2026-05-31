export type CollectionAvailability = "normal" | "leaving_soon" | "left";

export const COLLECTION_AVAILABILITY_OPTIONS: {
  value: CollectionAvailability;
  label: string;
  shortLabel: string;
  hint: string;
  dotClass: string;
  bannerClass: string;
}[] = [
  {
    value: "normal",
    label: "Normal prices",
    shortLabel: "Normal",
    hint: "Collection is available at normal prices",
    dotClass: "bg-emerald-500",
    bannerClass: "",
  },
  {
    value: "leaving_soon",
    label: "Leaving soon",
    shortLabel: "Soon",
    hint: "Few days left — this collection will leave us",
    dotClass: "bg-amber-400",
    bannerClass:
      "border-amber-500/40 bg-amber-950/30 text-amber-100",
  },
  {
    value: "left",
    label: "Collection left",
    shortLabel: "Left",
    hint: "This collection has left us — extra fees may apply if you still want items",
    dotClass: "bg-rose-500",
    bannerClass: "border-rose-500/40 bg-rose-950/30 text-rose-100",
  },
];

const VALID = new Set<string>(COLLECTION_AVAILABILITY_OPTIONS.map((o) => o.value));

export function normalizeCollectionAvailability(
  value: string | null | undefined
): CollectionAvailability {
  if (value && VALID.has(value)) return value as CollectionAvailability;
  return "normal";
}

export function getAvailabilityOption(status: string | null | undefined) {
  return COLLECTION_AVAILABILITY_OPTIONS.find(
    (o) => o.value === normalizeCollectionAvailability(status)
  )!;
}

export function isValidCollectionAvailability(
  value: unknown
): value is CollectionAvailability {
  return typeof value === "string" && VALID.has(value);
}
