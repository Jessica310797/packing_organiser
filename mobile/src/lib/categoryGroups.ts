/** Canonical packing categories, in the order they should display -- kept in sync with lib/categoryIcon.ts. */
export const CATEGORY_ORDER = [
  "clothing",
  "footwear",
  "toiletries",
  "electronics",
  "documents",
  "accessories",
  "medication",
  "essentials",
  "other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Clothing",
  footwear: "Footwear",
  toiletries: "Toiletries",
  electronics: "Electronics",
  documents: "Documents",
  accessories: "Accessories",
  medication: "Medication",
  essentials: "Travel Essentials",
  other: "Other",
};

export interface CategoryGroup<T> {
  key: string;
  label: string;
  items: T[];
}

/**
 * Groups items by their (freeform, case-insensitive) category into a fixed
 * display order -- anything missing or not one of the known categories
 * falls into "Other" rather than spawning an unpredictable one-off section.
 * Item order within each group is preserved from the input.
 */
export function groupByCategory<T>(
  items: T[],
  getCategory: (item: T) => string | null | undefined,
): CategoryGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const raw = getCategory(item)?.toLowerCase().trim();
    const key = raw && CATEGORY_LABELS[raw] ? raw : "other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }
  return CATEGORY_ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    items: buckets.get(key)!,
  }));
}
