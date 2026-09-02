import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getPackingRecommendations } from "../src/recommendations/recommendationService.js";
import { normalizeName, normalizeCategory } from "../src/normalize.js";
import type { InventoryItem, Trip } from "../src/types.js";
import type { TripWeather } from "../src/weather/weatherService.js";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Lisbon, Portugal",
    purpose: "Leisure / Holiday",
    startDate: "2026-09-10",
    endDate: "2026-09-17",
    durationDays: 7,
    activities: [],
    packingTarget: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeItem(name: string, quantity: number, category: string | null = null): InventoryItem {
  return {
    id: `item-${name}`,
    tripId: "trip-1",
    name,
    normalizedName: normalizeName(name),
    category: normalizeCategory(category),
    quantity,
    confidence: null,
    status: "active",
    source: "manual",
    packed: true,
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const NO_WEATHER: TripWeather = { available: false };

describe("getPackingRecommendations", () => {
  test("recommends base items on every trip, all missing with an empty inventory", () => {
    const result = getPackingRecommendations(makeTrip(), [], NO_WEATHER);
    const passport = result.find((r) => r.name === "Passport");
    assert.ok(passport);
    assert.equal(passport.status, "missing");
    assert.equal(passport.packedQuantity, 0);
    assert.deepEqual(passport.reasons, ["Every trip"]);
  });

  test("marks an item as packed when logged inventory covers the recommended quantity", () => {
    const result = getPackingRecommendations(makeTrip(), [makeItem("Passport", 1)], NO_WEATHER);
    const passport = result.find((r) => r.name === "Passport");
    assert.ok(passport);
    assert.equal(passport.status, "packed");
    assert.equal(passport.packedQuantity, 1);
  });

  test("marks an item partial when some but not enough is logged", () => {
    // Underwear scales 1/day for a 7-day trip -> recommends 7.
    const result = getPackingRecommendations(makeTrip(), [makeItem("Underwear", 3)], NO_WEATHER);
    const underwear = result.find((r) => r.name === "Underwear");
    assert.ok(underwear);
    assert.equal(underwear.recommendedQuantity, 7);
    assert.equal(underwear.packedQuantity, 3);
    assert.equal(underwear.status, "partial");
  });

  test("caps per-day-scaled quantities at their maximum", () => {
    const result = getPackingRecommendations(makeTrip({ durationDays: 30 }), [], NO_WEATHER);
    const underwear = result.find((r) => r.name === "Underwear");
    assert.ok(underwear);
    assert.equal(underwear.recommendedQuantity, 10);
  });

  test("adds purpose-specific items", () => {
    const result = getPackingRecommendations(makeTrip({ purpose: "Beach Holiday" }), [], NO_WEATHER);
    assert.ok(result.some((r) => r.name === "Swimwear"));
    assert.ok(result.some((r) => r.name === "Sunscreen"));
  });

  test("adds activity-specific items for each planned activity", () => {
    const result = getPackingRecommendations(makeTrip({ activities: ["Hiking", "Golf"] }), [], NO_WEATHER);
    assert.ok(result.some((r) => r.name === "Hiking boots"));
    assert.ok(result.some((r) => r.name === "Golf shoes"));
  });

  test("dedups an item recommended by multiple sources instead of listing it twice", () => {
    // Swimwear is recommended by both "Beach Holiday" purpose and "Swimming" activity.
    const result = getPackingRecommendations(
      makeTrip({ purpose: "Beach Holiday", activities: ["Swimming"] }),
      [],
      NO_WEATHER,
    );
    const swimwear = result.filter((r) => r.name === "Swimwear");
    assert.equal(swimwear.length, 1);
    assert.ok(swimwear[0]!.reasons.includes("Beach Holiday"));
    assert.ok(swimwear[0]!.reasons.includes("Swimming"));
  });

  test("adds cold-weather items only when the real forecast is cold", () => {
    const cold = getPackingRecommendations(makeTrip(), [], { available: true, tempC: 4, condition: "Cloudy" });
    assert.ok(cold.some((r) => r.name === "Warm jacket"));

    const mild = getPackingRecommendations(makeTrip(), [], { available: true, tempC: 18, condition: "Cloudy" });
    assert.ok(!mild.some((r) => r.name === "Warm jacket"));
  });

  test("adds hot-weather and rain items based on the real forecast", () => {
    const hot = getPackingRecommendations(makeTrip(), [], { available: true, tempC: 32, condition: "Sunny" });
    assert.ok(hot.some((r) => r.name === "Sunscreen"));

    const rainy = getPackingRecommendations(makeTrip(), [], { available: true, tempC: 15, condition: "Rain" });
    assert.ok(rainy.some((r) => r.name === "Rain jacket"));
  });

  test("never fabricates weather items when the forecast is unavailable", () => {
    const result = getPackingRecommendations(makeTrip(), [], NO_WEATHER);
    assert.ok(!result.some((r) => r.reasons.some((reason) => reason.startsWith("Forecast:"))));
  });

  test("sorts missing items before partial, and partial before packed", () => {
    const result = getPackingRecommendations(
      makeTrip(),
      [makeItem("Passport", 1), makeItem("Underwear", 2)],
      NO_WEATHER,
    );
    const statuses = result.map((r) => r.status);
    const firstPackedIndex = statuses.indexOf("packed");
    const lastMissingIndex = statuses.lastIndexOf("missing");
    assert.ok(firstPackedIndex === -1 || lastMissingIndex < firstPackedIndex);
  });

  test("matchedItemIds lists the real inventory item(s) backing a recommendation", () => {
    const item = makeItem("Passport", 1);
    const result = getPackingRecommendations(makeTrip(), [item], NO_WEATHER);
    const passport = result.find((r) => r.name === "Passport");
    assert.ok(passport);
    assert.deepEqual(passport.matchedItemIds, [item.id]);
  });

  test("matchedItemIds is empty for a recommendation with nothing packed yet", () => {
    const result = getPackingRecommendations(makeTrip(), [], NO_WEATHER);
    const passport = result.find((r) => r.name === "Passport");
    assert.ok(passport);
    assert.deepEqual(passport.matchedItemIds, []);
  });

  test("recomputes status when a later source raises the merged recommended quantity", () => {
    // "Swimming" alone recommends 1 swimwear; with 1 packed that reads as
    // "packed" in isolation. "Diving / Snorkeling" recommends 2 (a spare).
    // Once merged, the item must re-derive its status from the higher
    // quantity rather than staying "packed" from whichever source landed
    // first in the merge.
    const result = getPackingRecommendations(
      makeTrip({ purpose: "Leisure / Holiday", activities: ["Swimming", "Diving / Snorkeling"] }),
      [makeItem("Swimwear", 1)],
      NO_WEATHER,
    );
    const swimwear = result.find((r) => r.name === "Swimwear");
    assert.ok(swimwear);
    assert.equal(swimwear.recommendedQuantity, 2);
    assert.equal(swimwear.packedQuantity, 1);
    assert.equal(swimwear.status, "partial");
  });
});
