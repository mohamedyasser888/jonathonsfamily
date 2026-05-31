import {
  getAvailabilityOption,
  normalizeCollectionAvailability,
} from "@/lib/collection-availability";

type Props = {
  status?: string | null;
  className?: string;
  /** On cards: absolute top-right. In titles: inline beside text. */
  inline?: boolean;
};

/** Medium dot — top-right on collection cards */
export default function CollectionAvailabilityDot({
  status,
  className = "",
  inline = false,
}: Props) {
  const option = getAvailabilityOption(normalizeCollectionAvailability(status));

  const position = inline
    ? "inline-block shrink-0 align-middle"
    : "absolute top-3 right-3 z-10";

  return (
    <span
      className={`${position} w-3 h-3 rounded-full shadow-md ring-2 ring-black/50 ${option.dotClass} ${className}`}
      title={option.hint}
      aria-label={option.label}
      role="img"
    />
  );
}
