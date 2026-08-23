import { z } from "zod";

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

export const IdentifiedItemSchema = z.object({
  name: z.string().describe("Short, specific name of the item, e.g. 'Blue rain jacket'"),
  category: z.enum(ITEM_CATEGORIES),
  description: z.string().describe("One sentence describing distinguishing details (color, material, brand if visible)"),
  confidence: z.enum(["low", "medium", "high"]),
});

export type IdentifiedItem = z.infer<typeof IdentifiedItemSchema>;

export const IdentifyRequestSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  imageBase64: z.string().optional(),
  imageMediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

export type IdentifyRequest = z.infer<typeof IdentifyRequestSchema>;
