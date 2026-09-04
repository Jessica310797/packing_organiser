import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { reconcileDetections } from "../src/inventory/reconciler.js";
import { normalizeName } from "../src/normalize.js";
import type { DetectedItem, InventoryItem } from "../src/types.js";
import type { LLMMatchDecision, LLMMatcher } from "../src/inventory/reconciler.js";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `id-${idCounter}`;
}

function makeItem(overrides: Partial<InventoryItem> & { name: string }): InventoryItem {
  return {
    id: overrides.id ?? nextId(),
    tripId: "trip-1",
    name: overrides.name,
    normalizedName: overrides.normalizedName ?? normalizeName(overrides.name),
    category: overrides.category ?? null,
    quantity: overrides.quantity ?? 1,
    confidence: overrides.confidence ?? 0.9,
    status: overrides.status ?? "active",
    source: overrides.source ?? "vision",
    packed: overrides.packed ?? true,
    photoUrl: overrides.photoUrl ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

function makeDetection(name: string, category: string | null = null, confidence = 0.9): DetectedItem {
  return { name, category, quantity: 1, confidence };
}

/** A matcher whose decisions are scripted per-test, so tests don't hit the real API. */
function scriptedMatcher(decisions: LLMMatchDecision[]): LLMMatcher {
  return {
    async reconcile() {
      return decisions;
    },
  };
}

/** A matcher that asserts on what it was called with, then returns scripted decisions. */
function inspectingMatcher(
  decisions: LLMMatchDecision[],
  onCall: (existingItems: Pick<InventoryItem, "id" | "name" | "category">[], detections: DetectedItem[]) => void,
): LLMMatcher {
  return {
    async reconcile(existingItems, detections) {
      onCall(existingItems, detections);
      return decisions;
    },
  };
}

describe("reconcileDetections - tier 1 heuristic matching", () => {
  test("matches an identical item re-detected in a later photo (no LLM call needed)", async () => {
    const existing = [makeItem({ name: "Blue T-Shirt", category: "clothing" })];
    let llmCalled = false;
    const matcher = inspectingMatcher([], () => {
      llmCalled = true;
    });

    const result = await reconcileDetections(
      existing,
      [makeDetection("Blue T-Shirt", "clothing")],
      { llmMatcher: matcher },
    );

    assert.equal(llmCalled, false, "heuristic match should short-circuit the LLM call");
    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0]!.itemId, existing[0]!.id);
    assert.equal(result.matched[0]!.method, "heuristic");
    assert.equal(result.added.length, 0);
    assert.equal(result.ambiguous.length, 0);
  });

  test("is case/plural/article-insensitive", async () => {
    const existing = [makeItem({ name: "Sock", category: "clothing" })];
    const matcher = scriptedMatcher([]);

    const result = await reconcileDetections(existing, [makeDetection("a pair of socks", "Clothing")], {
      llmMatcher: matcher,
    });

    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0]!.method, "heuristic");
  });

  test("does not double-claim the same existing item for two detections in one photo", async () => {
    const existing = [makeItem({ name: "Sock", category: "clothing" })];
    // Vision model hallucinated the same item twice in one frame.
    const matcher = scriptedMatcher([{ detectionIndex: 0, decision: "new" }]);

    const result = await reconcileDetections(
      existing,
      [makeDetection("Sock", "clothing"), makeDetection("Sock", "clothing")],
      { llmMatcher: matcher },
    );

    assert.equal(result.matched.length, 1, "only the first detection should claim the existing item");
    assert.equal(result.added.length, 1, "the second falls through to the LLM tier and is decided there");
  });
});

describe("reconcileDetections - tier 2 LLM matching", () => {
  test("only sends leftover (unmatched) items and detections to the LLM", async () => {
    const existing = [
      makeItem({ name: "Blue T-Shirt", category: "clothing" }),
      makeItem({ name: "Passport", category: "documents" }),
    ];
    let seenExisting: Pick<InventoryItem, "id" | "name" | "category">[] = [];
    let seenDetections: DetectedItem[] = [];
    const matcher = inspectingMatcher(
      [{ detectionIndex: 0, decision: "match", matchedItemId: existing[1]!.id }],
      (e, d) => {
        seenExisting = e;
        seenDetections = d;
      },
    );

    await reconcileDetections(
      existing,
      [makeDetection("Blue T-Shirt", "clothing"), makeDetection("travel document", "documents")],
      { llmMatcher: matcher },
    );

    assert.equal(seenExisting.length, 1, "the heuristically-matched item should be excluded from the LLM batch");
    assert.equal(seenExisting[0]!.id, existing[1]!.id);
    assert.equal(seenDetections.length, 1);
    assert.equal(seenDetections[0]!.name, "travel document");
  });

  test("merges a paraphrased match instead of adding a duplicate", async () => {
    const existing = [makeItem({ name: "Blue T-Shirt", category: "clothing" })];
    const matcher = scriptedMatcher([
      { detectionIndex: 0, decision: "match", matchedItemId: existing[0]!.id },
    ]);

    const result = await reconcileDetections(existing, [makeDetection("navy shirt", "clothing")], {
      llmMatcher: matcher,
    });

    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0]!.itemId, existing[0]!.id);
    assert.equal(result.matched[0]!.method, "llm");
    assert.equal(result.added.length, 0);
  });

  test("adds a genuinely new item", async () => {
    const existing = [makeItem({ name: "Blue T-Shirt", category: "clothing" })];
    const matcher = scriptedMatcher([{ detectionIndex: 0, decision: "new" }]);

    const result = await reconcileDetections(existing, [makeDetection("Sunglasses", "accessories")], {
      llmMatcher: matcher,
    });

    assert.equal(result.added.length, 1);
    assert.equal(result.matched.length, 0);
    assert.equal(result.ambiguous.length, 0);
  });

  test("queues an ambiguous detection instead of guessing", async () => {
    // Neither existing item's normalized name literally equals the detection's,
    // so tier 1 can't resolve it and it's genuinely up to the (mocked) LLM tier.
    const existing = [
      makeItem({ name: "Black Sock", category: "clothing" }),
      makeItem({ name: "Grey Sock", category: "clothing" }),
    ];
    const matcher = scriptedMatcher([
      {
        detectionIndex: 0,
        decision: "ambiguous",
        candidateItemIds: [existing[0]!.id, existing[1]!.id],
      },
    ]);

    const result = await reconcileDetections(existing, [makeDetection("dark sock", "clothing")], {
      llmMatcher: matcher,
    });

    assert.equal(result.ambiguous.length, 1);
    assert.equal(result.matched.length, 0);
    assert.equal(result.added.length, 0);
    assert.deepEqual(result.ambiguous[0]!.candidateItemIds.sort(), [existing[0]!.id, existing[1]!.id].sort());
  });

  test("treats a malformed/missing LLM decision as ambiguous rather than fabricating an item", async () => {
    const existing = [makeItem({ name: "Blue T-Shirt", category: "clothing" })];
    const matcher = scriptedMatcher([]); // no decision returned for the detection

    const result = await reconcileDetections(existing, [makeDetection("mystery item", "clothing")], {
      llmMatcher: matcher,
    });

    assert.equal(result.added.length, 0);
    assert.equal(result.matched.length, 0);
    assert.equal(result.ambiguous.length, 1);
  });

  test("treats a match pointing at an already-claimed item as ambiguous, not a silent merge", async () => {
    const existing = [makeItem({ name: "Charger", category: "electronics" })];
    // Two different detections both claim to match the same single existing item.
    const matcher = scriptedMatcher([
      { detectionIndex: 0, decision: "match", matchedItemId: existing[0]!.id },
      { detectionIndex: 1, decision: "match", matchedItemId: existing[0]!.id },
    ]);

    const result = await reconcileDetections(
      existing,
      [makeDetection("phone charger", "electronics"), makeDetection("usb cable", "electronics")],
      { llmMatcher: matcher },
    );

    assert.equal(result.matched.length, 1);
    assert.equal(result.ambiguous.length, 1);
    assert.equal(result.added.length, 0);
  });
});

describe("reconcileDetections - multi-photo packing session (no double counting)", () => {
  test("three sequential photos of an overlapping suitcase converge on the correct unique inventory", async () => {
    // Simulates the real product flow: run reconcileDetections once per photo,
    // folding matches/adds into a running "active inventory" between calls,
    // the way the inventory service will.
    let inventory: InventoryItem[] = [];

    async function ingestPhoto(detections: DetectedItem[], matcher: LLMMatcher) {
      const result = await reconcileDetections(inventory, detections, { llmMatcher: matcher });
      for (const { detection, itemId } of result.added) {
        inventory.push(
          makeItem({
            id: itemId,
            name: detection.name,
            category: detection.category,
            confidence: detection.confidence,
          }),
        );
      }
      return result;
    }

    // Photo 1: shirt + passport visible. With an empty starting inventory,
    // tier 1 has nothing to match against, so both fall through to the LLM tier.
    await ingestPhoto(
      [makeDetection("Blue T-Shirt", "clothing"), makeDetection("Passport", "documents")],
      scriptedMatcher([
        { detectionIndex: 0, decision: "new" },
        { detectionIndex: 1, decision: "new" },
      ]),
    );
    assert.equal(inventory.length, 2);

    // Photo 2: same shirt and passport still in shot (repositioned), plus a new item.
    const photo2Result = await ingestPhoto(
      [
        makeDetection("Blue T-Shirt", "clothing"), // exact repeat -> heuristic match
        makeDetection("travel document", "documents"), // paraphrase of passport -> LLM match
        makeDetection("Sunglasses", "accessories"), // genuinely new
      ],
      scriptedMatcher([
        // Only the paraphrase + the new item reach the LLM (shirt matched by tier 1).
        { detectionIndex: 0, decision: "match", matchedItemId: inventory[1]!.id }, // passport
        { detectionIndex: 1, decision: "new" }, // sunglasses
      ]),
    );
    assert.equal(photo2Result.matched.length, 2, "shirt (heuristic) + passport (llm)");
    assert.equal(photo2Result.added.length, 1, "sunglasses");
    assert.equal(inventory.length, 3);

    // Photo 3: everything still in the case, nothing new.
    const photo3Result = await ingestPhoto(
      [
        makeDetection("Blue T-Shirt", "clothing"),
        makeDetection("Passport", "documents"),
        makeDetection("Sunglasses", "accessories"),
      ],
      scriptedMatcher([]), // tier 1 alone should resolve all three
    );
    assert.equal(photo3Result.matched.length, 3);
    assert.equal(photo3Result.added.length, 0);
    assert.equal(inventory.length, 3, "inventory must not grow just because items were photographed again");
  });
});
