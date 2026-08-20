export const ITEM_CATEGORIES = [
  "Clothing",
  "Footwear",
  "Toiletries",
  "Electronics",
  "Documents",
  "Accessories",
  "Medication",
  "Gear & Equipment",
  "Other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type Confidence = "low" | "medium" | "high";

export interface IdentifiedItem {
  name: string;
  category: ItemCategory;
  description: string;
  confidence: Confidence;
}

export interface PackedItem extends IdentifiedItem {
  id: string;
  photoUri?: string;
  createdAt: string;
}
