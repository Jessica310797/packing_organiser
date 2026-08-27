import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

type GlyphName = keyof typeof MaterialCommunityIcons.glyphMap;

const CATEGORY_ICONS: Record<string, GlyphName> = {
  clothing: "tshirt-crew-outline",
  footwear: "shoe-sneaker",
  toiletries: "bottle-tonic-outline",
  electronics: "power-plug-outline",
  documents: "file-document-outline",
  accessories: "watch-variant",
  medication: "pill",
  essentials: "bag-personal-outline",
  other: "package-variant-closed",
};

/** Maps a (lowercase, freeform) item category to a representative line icon, falling back to a generic "item" icon. */
export function categoryIconName(category: string | null | undefined): GlyphName {
  if (!category) return CATEGORY_ICONS.other!;
  return CATEGORY_ICONS[category.toLowerCase().trim()] ?? CATEGORY_ICONS.other!;
}
