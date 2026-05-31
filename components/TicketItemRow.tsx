import type { TicketItem } from "@/lib/types/ticket";
import PriceDisplay from "@/components/PriceDisplay";
import { formatPriceDisplay } from "@/lib/magical-price";

type TicketItemRowProps = {
  item: TicketItem;
  imageSize?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

export default function TicketItemRow({
  item,
  imageSize = "md",
}: TicketItemRowProps) {
  const imgClass = sizeClasses[imageSize];
  const isMarket = item.kind === "market";
  // Use price_label (magical format) instead of numeric price
  const linePrice = item.price_label ?? item.price;

  if (isMarket && item.request_text) {
    return (
      <div className="py-3 first:pt-0 border-t border-zinc-900 first:border-t-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 bg-fuchsia-950/40 border border-fuchsia-500/30 px-2 py-0.5 rounded">
            Market request
          </span>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
          {item.request_text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 border-t border-zinc-900 first:border-t-0">
      <div
        className={`${imgClass} bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-zinc-800`}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
            No image
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold text-white text-sm truncate">{item.name}</span>
          <span className="font-semibold text-violet-400 text-sm shrink-0">
            <PriceDisplay price={linePrice} />
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Qty {item.quantity} × {formatPriceDisplay(linePrice)}
        </p>
        {item.collection_name && (
          <span className="inline-block mt-1.5 text-[10px] bg-zinc-900 text-violet-400 px-2 py-0.5 rounded border border-zinc-800">
            {item.collection_name}
          </span>
        )}
      </div>
    </div>
  );
}
