/**
 * Magical prices: number + one letter (e.g. 8g, 5s, 20k) or letter alone (= 1 unit).
 * k — 1,000 each | s — 10,000 each | g — 1,000,000 each
 * Same letter in a cart is summed (8g + 2g → 10g). Never mix letters in one price (no "8gs").
 */

export const MAGICAL_LETTER_VALUES = {
  k: 1_000,
  s: 10_000,
  g: 1_000_000,
} as const;

export type MagicalLetter = keyof typeof MAGICAL_LETTER_VALUES;

const LETTER_ORDER: MagicalLetter[] = ["g", "s", "k"];

export type MagicalUnit = {
  letter: MagicalLetter;
  amount: number;
};

export type ParsedMagicalPrice = {
  valid: true;
  storage: string;
  display: string;
  numeric: number;
  isMagical: boolean;
  unit?: MagicalUnit;
};

export type InvalidMagicalPrice = {
  valid: false;
  error: string;
};

export type MagicalPriceResult = ParsedMagicalPrice | InvalidMagicalPrice;

function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  return String(Number(amount.toFixed(2)));
}

export function parseMagicalUnit(storage: string): MagicalUnit | null {
  const lower = storage.trim().toLowerCase();
  const withNumber = lower.match(/^(\d+(?:\.\d+)?)\s*([ksg])$/);
  if (withNumber) {
    const amount = parseFloat(withNumber[1]);
    if (amount < 0 || Number.isNaN(amount)) return null;
    return { amount, letter: withNumber[2] as MagicalLetter };
  }
  if (/^[ksg]$/.test(lower)) {
    return { amount: 1, letter: lower as MagicalLetter };
  }
  return null;
}

function buildMagicalParsed(unit: MagicalUnit): ParsedMagicalPrice {
  const storage = `${formatAmount(unit.amount)}${unit.letter}`;
  const display = `${formatAmount(unit.amount)}${unit.letter.toUpperCase()}`;
  const numeric = unit.amount * MAGICAL_LETTER_VALUES[unit.letter];
  return {
    valid: true,
    storage,
    display,
    numeric,
    isMagical: true,
    unit,
  };
}

export function parseMagicalPrice(
  input: string | number | null | undefined
): MagicalPriceResult {
  if (input === null || input === undefined) {
    return { valid: false, error: "Price is required" };
  }

  const raw = String(input).trim();
  if (!raw) {
    return { valid: false, error: "Price is required" };
  }

  const lower = raw.toLowerCase().replace(/\s+/g, "");

  const letterMatches = lower.match(/[ksg]/g);
  if (letterMatches && letterMatches.length > 1) {
    return {
      valid: false,
      error: "Use only one letter per price (k, s, or g). Example: 8g — not 8gs or 8gk.",
    };
  }

  const unitFromNumber = lower.match(/^(\d+(?:\.\d+)?)([ksg])$/);
  if (unitFromNumber) {
    const amount = parseFloat(unitFromNumber[1]);
    if (amount < 0 || Number.isNaN(amount)) {
      return { valid: false, error: "Amount must be a valid number." };
    }
    return buildMagicalParsed({
      amount,
      letter: unitFromNumber[2] as MagicalLetter,
    });
  }

  if (/^[ksg]$/.test(lower)) {
    return buildMagicalParsed({ amount: 1, letter: lower as MagicalLetter });
  }

  if (/^\d+(\.\d+)?$/.test(lower)) {
    const numeric = parseFloat(lower);
    return {
      valid: true,
      storage: formatAmount(numeric),
      display: formatAmount(numeric),
      numeric,
      isMagical: false,
    };
  }

  if (/[ksg]/i.test(raw)) {
    return {
      valid: false,
      error: 'Put the number before one letter, e.g. 8g, 5s, 20k (or "20 k" with a space).',
    };
  }

  return {
    valid: false,
    error: "Price must be a number (25) or number + letter: 8g, 5s, 20k.",
  };
}

export function formatPriceDisplay(
  input: string | number | null | undefined
): string {
  // If input is a number, convert it back to magical format for display
  if (typeof input === 'number') {
    return numericToMagicalPrice(input);
  }
  const parsed = parseMagicalPrice(input);
  if (parsed.valid) return parsed.display;
  return String(input ?? "—");
}

export function isMagicalPriceDisplay(
  input: string | number | null | undefined
): boolean {
  const parsed = parseMagicalPrice(input);
  return parsed.valid && parsed.isMagical;
}

export function normalizePriceForStorage(
  input: string | number | null | undefined
): string | null {
  const parsed = parseMagicalPrice(input);
  return parsed.valid ? parsed.storage : null;
}

/** Sum cart lines: same letter amounts add up (8g + 2g → 10g). */
export function sumMagicalPriceLines(
  lines: { price: string | number; quantity: number }[]
): { display: string; hasMagical: boolean; totalNumeric: number } {
  const buckets: Record<MagicalLetter, number> = { k: 0, s: 0, g: 0 };
  let plainNumeric = 0;
  let hasMagical = false;

  for (const line of lines) {
    const parsed = parseMagicalPrice(line.price);
    if (!parsed.valid) continue;

    const qty = line.quantity > 0 ? line.quantity : 1;

    if (!parsed.isMagical || !parsed.unit) {
      plainNumeric += parsed.numeric * qty;
      continue;
    }

    hasMagical = true;
    buckets[parsed.unit.letter] += parsed.unit.amount * qty;
  }

  const parts: string[] = [];
  for (const letter of LETTER_ORDER) {
    if (buckets[letter] > 0) {
      parts.push(`${formatAmount(buckets[letter])}${letter.toUpperCase()}`);
    }
  }
  if (plainNumeric > 0) {
    parts.push(formatAmount(plainNumeric));
  }

  const totalNumeric =
    plainNumeric +
    LETTER_ORDER.reduce(
      (sum, letter) => sum + buckets[letter] * MAGICAL_LETTER_VALUES[letter],
      0
    );

  return {
    display: parts.length > 0 ? parts.join(" + ") : "0",
    hasMagical,
    totalNumeric,
  };
}

export const MAGICAL_PRICE_HINT =
  "Number + one letter: 8g, 5s, 20k (or k alone = 1k). Same letters in cart add up (8g + 2g → 10g). Never two letters in one price.";

/** Convert numeric value back to magical price format (e.g., 50000 → "5s") */
export function numericToMagicalPrice(numeric: number): string {
  if (numeric === 0) return "0";
  
  // Try to convert to largest possible unit first
  const gValue = Math.floor(numeric / 1_000_000);
  const sValue = Math.floor((numeric % 1_000_000) / 10_000);
  const kValue = Math.floor((numeric % 10_000) / 1_000);
  const remainder = numeric % 1_000;
  
  const parts: string[] = [];
  
  if (gValue > 0) parts.push(`${gValue}g`);
  if (sValue > 0) parts.push(`${sValue}s`);
  if (kValue > 0) parts.push(`${kValue}k`);
  if (remainder > 0) parts.push(String(remainder));
  
  return parts.length > 0 ? parts.join(" + ") : String(numeric);
}
