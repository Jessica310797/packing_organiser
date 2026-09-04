const STOP_WORDS = new Set(["a", "an", "the", "my", "some", "pair", "of"]);

// Words that look plural but should never be singularized.
const SINGULARIZE_EXCEPTIONS = new Set([
  "sunglasses",
  "glasses",
  "shorts",
  "pants",
  "jeans",
  "pajamas",
  "pyjamas",
  "scissors",
  "tights",
  "leggings",
  "flip-flops",
  "headphones",
  "toiletries",
]);

function singularize(word: string): string {
  if (SINGULARIZE_EXCEPTIONS.has(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("es") && word.length > 4 && /(sh|ch|x|s)es$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

/**
 * Normalizes a detected item name into a comparable key for tier-1 heuristic
 * matching: lowercased, punctuation stripped, stop words and quantity words
 * dropped, and each remaining word singularized. Two detections that reduce
 * to the same normalized name are treated as the same physical item type.
 */
export function normalizeName(raw: string): string {
  const words = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .map(singularize);

  return words.join(" ").trim();
}

export function normalizeCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}
