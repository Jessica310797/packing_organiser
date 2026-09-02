import type { InventoryItem, RecommendedItem } from "../api/types";
import { groupByCategory, type CategoryGroup } from "./categoryGroups";

export interface ChecklistModel {
  /** Actually-packed items, grouped by category -- excludes anything still fully/partially
   * represented by an unfinished suggestion below, so nothing renders twice. */
  packedGroups: CategoryGroup<InventoryItem>[];
  /** Real items on the list but not yet packed -- always shown here regardless of
   * whether they also happen to match a suggestion, since they need to stay
   * directly editable/removable rather than hidden behind an aggregate card. */
  toPackGroups: CategoryGroup<InventoryItem>[];
  /** Recommendations not yet fully packed, flat (not grouped), missing before partial. */
  suggestions: RecommendedItem[];
  packedCount: number;
  toPackCount: number;
  totalPacked: number;
  totalRecommended: number;
}

const STATUS_RANK: Record<RecommendedItem["status"], number> = { missing: 0, partial: 1, packed: 2 };

/**
 * Merges real inventory with AI recommendations into one checklist. Real
 * items split into "packed" and "to pack" (see InventoryItem.packed) --
 * un-packing something moves it between these, it never just vanishes. A
 * recommendation that's fully packed is represented only by its real
 * item(s) in the packed list (never a second "packed" card); anything
 * still missing or partial shows once as an actionable suggestion.
 */
export function buildChecklist(inventory: InventoryItem[], recommendations: RecommendedItem[]): ChecklistModel {
  const stillNeededItemIds = new Set<string>();
  for (const r of recommendations) {
    if (r.status !== "packed") {
      for (const id of r.matchedItemIds) stillNeededItemIds.add(id);
    }
  }

  const packedOnly = inventory.filter((item) => item.packed && !stillNeededItemIds.has(item.id));
  const toPackOnly = inventory.filter((item) => !item.packed);

  const packedGroups = groupByCategory(packedOnly, (item) => item.category);
  const toPackGroups = groupByCategory(toPackOnly, (item) => item.category);

  const suggestions = recommendations
    .filter((r) => r.status !== "packed")
    .sort((a, b) => {
      const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
    });

  const totalRecommended = recommendations.reduce((sum, r) => sum + r.recommendedQuantity, 0);
  const totalPacked = recommendations.reduce((sum, r) => sum + Math.min(r.packedQuantity, r.recommendedQuantity), 0);

  return {
    packedGroups,
    toPackGroups,
    suggestions,
    packedCount: packedOnly.length,
    toPackCount: toPackOnly.length,
    totalPacked,
    totalRecommended,
  };
}
