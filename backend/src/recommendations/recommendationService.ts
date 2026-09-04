import { normalizeName } from "../normalize.js";
import { ACTIVITY_ITEMS, BASE_ITEMS, PURPOSE_ITEMS, resolveQuantity, type ItemTemplate } from "./packingTemplates.js";
import type { InventoryItem, Trip } from "../types.js";
import type { TripWeather } from "../weather/weatherService.js";

export interface RecommendedItem {
  name: string;
  category: string;
  recommendedQuantity: number;
  packedQuantity: number;
  status: "packed" | "partial" | "missing";
  reasons: string[];
  /** Ids of the real inventory items whose normalized name matches this recommendation -- lets a client dedupe (don't render an item twice) and know exactly what to remove if the user un-packs it. */
  matchedItemIds: string[];
}

const STATUS_RANK: Record<RecommendedItem["status"], number> = { missing: 0, partial: 1, packed: 2 };

function weatherItems(weather: TripWeather): { template: ItemTemplate; reason: string }[] {
  if (!weather.available || weather.tempC === undefined) return [];
  const items: { template: ItemTemplate; reason: string }[] = [];
  const condition = (weather.condition ?? "").toLowerCase();

  if (weather.tempC < 12) {
    const reason = `Expect around ${weather.tempC}°C -- worth packing a warm layer.`;
    items.push({ template: { name: "Warm jacket", category: "Clothing", quantity: 1 }, reason });
    items.push({ template: { name: "Thermal layers", category: "Clothing", quantity: 1 }, reason });
  }
  if (weather.tempC > 27) {
    const reason = `Highs around ${weather.tempC}°C -- sun protection recommended.`;
    items.push({ template: { name: "Sunscreen", category: "Toiletries", quantity: 1 }, reason });
    items.push({ template: { name: "Sunglasses", category: "Essentials", quantity: 1 }, reason });
  }
  if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("shower")) {
    const reason = `Rain in the forecast (${weather.condition}) -- worth packing something waterproof.`;
    items.push({ template: { name: "Rain jacket", category: "Clothing", quantity: 1 }, reason });
  }
  if (condition.includes("snow")) {
    const reason = "Snow in the forecast -- pack for cold, wet conditions.";
    items.push({ template: { name: "Snow boots", category: "Footwear", quantity: 1 }, reason });
    items.push({ template: { name: "Gloves", category: "Clothing", quantity: 1 }, reason });
  }
  return items;
}

/**
 * Builds a suggested packing list for a trip from its purpose/activities/
 * duration/weather, then reconciles it against what's actually logged in
 * the inventory (exact normalized-name match, same as the reconciler's
 * heuristic tier) so status reflects real packed quantities, never a
 * fabricated number.
 */
export function getPackingRecommendations(
  trip: Trip,
  inventory: InventoryItem[],
  weather: TripWeather,
): RecommendedItem[] {
  const sources: { template: ItemTemplate; reason: string }[] = [];

  for (const template of BASE_ITEMS) {
    sources.push({ template, reason: "Every trip" });
  }
  for (const template of PURPOSE_ITEMS[trip.purpose] ?? []) {
    sources.push({ template, reason: trip.purpose });
  }
  for (const activity of trip.activities) {
    for (const template of ACTIVITY_ITEMS[activity] ?? []) {
      sources.push({ template, reason: activity });
    }
  }
  sources.push(...weatherItems(weather));

  const packedByName = new Map<string, number>();
  const itemIdsByName = new Map<string, string[]>();
  for (const item of inventory) {
    packedByName.set(item.normalizedName, (packedByName.get(item.normalizedName) ?? 0) + item.quantity);
    const ids = itemIdsByName.get(item.normalizedName) ?? [];
    ids.push(item.id);
    itemIdsByName.set(item.normalizedName, ids);
  }

  const merged = new Map<string, RecommendedItem>();
  for (const { template, reason } of sources) {
    const key = normalizeName(template.name);
    const quantity = resolveQuantity(template, trip.durationDays);
    const existing = merged.get(key);

    if (existing) {
      existing.recommendedQuantity = Math.max(existing.recommendedQuantity, quantity);
      existing.status =
        existing.packedQuantity >= existing.recommendedQuantity
          ? "packed"
          : existing.packedQuantity > 0
            ? "partial"
            : "missing";
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      continue;
    }

    const packedQuantity = packedByName.get(key) ?? 0;
    merged.set(key, {
      name: template.name,
      category: template.category,
      recommendedQuantity: quantity,
      packedQuantity,
      status: packedQuantity >= quantity ? "packed" : packedQuantity > 0 ? "partial" : "missing",
      reasons: [reason],
      matchedItemIds: itemIdsByName.get(key) ?? [],
    });
  }

  return Array.from(merged.values()).sort((a, b) => {
    const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  });
}
