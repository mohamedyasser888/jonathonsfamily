import {
  getAvailabilityOption,
  normalizeCollectionAvailability,
} from "@/lib/collection-availability";

type Props = {
  status?: string | null;
};

export default function CollectionAvailabilityBanner({ status }: Props) {
  const normalized = normalizeCollectionAvailability(status);
  if (normalized === "normal") return null;

  const option = getAvailabilityOption(normalized);

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${option.bannerClass}`}
      role="status"
    >
      <strong className="font-bold">{option.label}.</strong>{" "}
      {normalized === "leaving_soon"
        ? "This collection will leave us soon — order while it is still here at normal prices."
        : "This collection has left us. If you still want something from it, you may be charged extra fees."}
    </div>
  );
}
