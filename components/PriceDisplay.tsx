import { formatPriceDisplay, numericToMagicalPrice } from "@/lib/magical-price";

type PriceDisplayProps = {
  price: string | number | null | undefined;
  className?: string;
  /** Prefix for numeric-only prices (magical letters show without $) */
  numericPrefix?: string;
};

export default function PriceDisplay({
  price,
  className = "",
  numericPrefix = "",
}: PriceDisplayProps) {
  let text: string;

  // If price is a number, convert it back to magical format for display
  if (typeof price === 'number') {
    text = numericToMagicalPrice(price);
  } else {
    text = formatPriceDisplay(price);
  }

  return (
    <span className={className} title={text}>
      {numericPrefix && !/^[KSG]$/i.test(text) ? numericPrefix : null}
      {text}
    </span>
  );
}
