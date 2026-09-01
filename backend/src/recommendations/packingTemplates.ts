/**
 * Rule-based packing suggestions. Deliberately not LLM-generated: this
 * keeps recommendations free, instant, offline-testable, and independent
 * of whether an ANTHROPIC_API_KEY is configured (unlike photo analysis).
 * These are advisory suggestions, not claims of fact -- quantities are
 * reasonable heuristics, not a science.
 */

import type { PackingListCategory } from "../types.js";

export interface ItemTemplate {
  name: string;
  category: string;
  /** Fixed quantity, e.g. "1 passport" regardless of trip length. */
  quantity?: number;
  /** Scaled by trip duration (days * factor, rounded up), when quantity isn't fixed. */
  perDayFactor?: number;
  /** Upper bound on a per-day-scaled quantity, so a 3-week trip doesn't recommend absurd amounts. */
  maxQuantity?: number;
}

/** Recommended on every trip, regardless of purpose or activities. */
export const BASE_ITEMS: ItemTemplate[] = [
  { name: "Passport", category: "Documents", quantity: 1 },
  { name: "Phone charger", category: "Electronics", quantity: 1 },
  { name: "Toothbrush", category: "Toiletries", quantity: 1 },
  { name: "Toothpaste", category: "Toiletries", quantity: 1 },
  { name: "Deodorant", category: "Toiletries", quantity: 1 },
  { name: "Underwear", category: "Clothing", perDayFactor: 1, maxQuantity: 10 },
  { name: "Socks", category: "Clothing", perDayFactor: 1, maxQuantity: 10 },
  { name: "T-shirt", category: "Clothing", perDayFactor: 0.6, maxQuantity: 7 },
];

/** Keyed by the exact strings in mobile/src/data/tripPurposes.ts. */
export const PURPOSE_ITEMS: Record<string, ItemTemplate[]> = {
  "Work Trip": [
    { name: "Laptop", category: "Electronics", quantity: 1 },
    { name: "Laptop charger", category: "Electronics", quantity: 1 },
    { name: "Business attire", category: "Clothing", quantity: 2 },
    { name: "Dress shoes", category: "Footwear", quantity: 1 },
  ],
  "Conference / Work Event": [
    { name: "Laptop", category: "Electronics", quantity: 1 },
    { name: "Laptop charger", category: "Electronics", quantity: 1 },
    { name: "Business cards", category: "Documents", quantity: 1 },
    { name: "Business attire", category: "Clothing", quantity: 2 },
  ],
  "Beach Holiday": [
    { name: "Swimwear", category: "Clothing", quantity: 2 },
    { name: "Sunscreen", category: "Toiletries", quantity: 1 },
    { name: "Flip-flops", category: "Footwear", quantity: 1 },
    { name: "Beach towel", category: "Essentials", quantity: 1 },
  ],
  "Wedding (Guest)": [
    { name: "Formal outfit", category: "Clothing", quantity: 1 },
    { name: "Dress shoes", category: "Footwear", quantity: 1 },
  ],
  "Stag Do": [
    { name: "Going-out outfit", category: "Clothing", quantity: 2 },
    { name: "Comfortable shoes", category: "Footwear", quantity: 1 },
  ],
  "Hen Do": [
    { name: "Going-out outfit", category: "Clothing", quantity: 2 },
    { name: "Comfortable shoes", category: "Footwear", quantity: 1 },
  ],
  Honeymoon: [
    { name: "Swimwear", category: "Clothing", quantity: 2 },
    { name: "Going-out outfit", category: "Clothing", quantity: 2 },
  ],
  "Adventure / Outdoor": [
    { name: "Hiking boots", category: "Footwear", quantity: 1 },
    { name: "Backpack", category: "Essentials", quantity: 1 },
    { name: "Rain jacket", category: "Clothing", quantity: 1 },
  ],
  "Festival / Event": [
    { name: "Comfortable shoes", category: "Footwear", quantity: 1 },
    { name: "Portable charger", category: "Electronics", quantity: 1 },
  ],
};

/** Keyed by the exact strings in mobile/src/data/activityOptions.ts. */
export const ACTIVITY_ITEMS: Record<string, ItemTemplate[]> = {
  Hiking: [
    { name: "Hiking boots", category: "Footwear", quantity: 1 },
    { name: "Backpack", category: "Essentials", quantity: 1 },
    { name: "Water bottle", category: "Essentials", quantity: 1 },
  ],
  Swimming: [
    { name: "Swimwear", category: "Clothing", quantity: 1 },
    { name: "Towel", category: "Essentials", quantity: 1 },
    { name: "Goggles", category: "Essentials", quantity: 1 },
  ],
  Watersports: [
    { name: "Swimwear", category: "Clothing", quantity: 1 },
    { name: "Quick-dry towel", category: "Essentials", quantity: 1 },
    { name: "Waterproof bag", category: "Essentials", quantity: 1 },
  ],
  Camping: [
    { name: "Sleeping bag", category: "Essentials", quantity: 1 },
    { name: "Flashlight", category: "Essentials", quantity: 1 },
    { name: "Insect repellent", category: "Toiletries", quantity: 1 },
  ],
  "Skiing / Snowboarding": [
    { name: "Ski jacket", category: "Clothing", quantity: 1 },
    { name: "Thermal layers", category: "Clothing", quantity: 2 },
    { name: "Gloves", category: "Clothing", quantity: 1 },
    { name: "Ski goggles", category: "Essentials", quantity: 1 },
  ],
  Cycling: [
    { name: "Cycling shorts", category: "Clothing", quantity: 1 },
    { name: "Helmet", category: "Essentials", quantity: 1 },
  ],
  "Diving / Snorkeling": [
    { name: "Snorkel mask", category: "Essentials", quantity: 1 },
    // A spare is worth recommending -- wet gear between dives.
    { name: "Swimwear", category: "Clothing", quantity: 2 },
  ],
  Fishing: [
    { name: "Hat", category: "Clothing", quantity: 1 },
    { name: "Sunscreen", category: "Toiletries", quantity: 1 },
  ],
  Golf: [
    { name: "Golf shoes", category: "Footwear", quantity: 1 },
    { name: "Golf gloves", category: "Essentials", quantity: 1 },
  ],
  Running: [
    { name: "Running shoes", category: "Footwear", quantity: 1 },
    { name: "Activewear", category: "Clothing", quantity: 2 },
  ],
  Climbing: [
    { name: "Climbing shoes", category: "Footwear", quantity: 1 },
    { name: "Chalk bag", category: "Essentials", quantity: 1 },
  ],
  Sightseeing: [{ name: "Comfortable walking shoes", category: "Footwear", quantity: 1 }],
  "Museums / Culture": [{ name: "Comfortable shoes", category: "Footwear", quantity: 1 }],
  Nightlife: [{ name: "Going-out outfit", category: "Clothing", quantity: 1 }],
  Shopping: [{ name: "Reusable bag", category: "Essentials", quantity: 1 }],
  "Spa / Wellness": [
    { name: "Swimwear", category: "Clothing", quantity: 1 },
    { name: "Flip-flops", category: "Footwear", quantity: 1 },
  ],
  "Wildlife / Safari": [
    { name: "Binoculars", category: "Essentials", quantity: 1 },
    { name: "Insect repellent", category: "Toiletries", quantity: 1 },
    { name: "Neutral-colored clothing", category: "Clothing", quantity: 2 },
  ],
  Photography: [
    { name: "Camera", category: "Electronics", quantity: 1 },
    { name: "Spare batteries or memory cards", category: "Electronics", quantity: 1 },
  ],
  "Business Meetings": [
    { name: "Business attire", category: "Clothing", quantity: 1 },
    { name: "Laptop", category: "Electronics", quantity: 1 },
  ],
};

/** Keyed by the exact strings in mobile/src/data/travelTypeOptions.ts. */
export const TRAVEL_TYPE_ITEMS: Record<string, ItemTemplate[]> = {
  Plane: [
    { name: "Travel pillow", category: "Essentials", quantity: 1 },
    { name: "Portable charger", category: "Electronics", quantity: 1 },
    { name: "Headphones", category: "Electronics", quantity: 1 },
    { name: "Travel documents wallet", category: "Documents", quantity: 1 },
  ],
  "Road Trip": [
    { name: "Car phone charger", category: "Electronics", quantity: 1 },
    { name: "Water bottle", category: "Essentials", quantity: 1 },
    { name: "Snacks", category: "Essentials", quantity: 1 },
  ],
  Train: [
    { name: "Travel pillow", category: "Essentials", quantity: 1 },
    { name: "Headphones", category: "Electronics", quantity: 1 },
    { name: "Portable charger", category: "Electronics", quantity: 1 },
  ],
  "Cruise / Ferry": [
    { name: "Motion sickness tablets", category: "Medication", quantity: 1 },
    { name: "Formal outfit", category: "Clothing", quantity: 1 },
    { name: "Lanyard", category: "Accessories", quantity: 1 },
  ],
  Bus: [
    { name: "Travel pillow", category: "Essentials", quantity: 1 },
    { name: "Headphones", category: "Electronics", quantity: 1 },
    { name: "Snacks", category: "Essentials", quantity: 1 },
  ],
};

/** Starter items for a new reusable packing list, matched by its category + exact name -- empty for a custom name with no template. */
export function findStarterItems(category: PackingListCategory, name: string): ItemTemplate[] {
  if (category === "activity") return ACTIVITY_ITEMS[name] ?? [];
  if (category === "travel_type") return TRAVEL_TYPE_ITEMS[name] ?? [];
  // "destination" lists reuse the purpose templates -- many purposes are
  // destination-flavored (Beach Holiday, City Break) and there's no separate
  // destination-specific template set.
  return PURPOSE_ITEMS[name] ?? [];
}

export function resolveQuantity(template: ItemTemplate, durationDays: number): number {
  if (template.quantity !== undefined) return template.quantity;
  const scaled = Math.ceil(durationDays * (template.perDayFactor ?? 1));
  const bounded = Math.max(1, scaled);
  return template.maxQuantity ? Math.min(bounded, template.maxQuantity) : bounded;
}
