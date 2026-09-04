import { randomUUID } from "node:crypto";
import { normalizeName, normalizeCategory } from "../normalize.js";
import type { DetectedItem, InventoryItem, ReconciliationResult } from "../types.js";

export interface LLMMatchDecision {
  /** Index into the *unmatched* detections array passed to reconcile(). */
  detectionIndex: number;
  decision: "match" | "new" | "ambiguous";
  matchedItemId?: string;
  candidateItemIds?: string[];
}

export interface LLMMatcher {
  reconcile(
    existingItems: Pick<InventoryItem, "id" | "name" | "category">[],
    detections: DetectedItem[],
  ): Promise<LLMMatchDecision[]>;
}

export interface ReconcileDeps {
  llmMatcher: LLMMatcher;
  generateId?: () => string;
}

/**
 * Reconciles items freshly detected in one photo against the trip's existing
 * active inventory, deciding for each detection whether it is:
 *  - a duplicate of an item already counted (heuristic or LLM match) -> not re-added
 *  - a genuinely new item -> added to the inventory
 *  - ambiguous -> left out of the inventory and queued for manual review
 *
 * Tier 1 (heuristic, free): exact match on normalized name + normalized
 * category against existing items not already claimed by an earlier
 * detection in this same batch. Handles the common case of the same item
 * photographed again.
 *
 * Tier 2 (LLM): only the leftover detections and leftover existing items are
 * sent to the LLM matcher, which can recognise paraphrases ("navy shirt" vs
 * "blue t-shirt"). Anything the matcher is unsure about -- or any response
 * that doesn't cleanly resolve -- comes back as "ambiguous" rather than
 * being guessed, so the inventory never silently drops or duplicates items.
 */
export async function reconcileDetections(
  existingItems: InventoryItem[],
  detections: DetectedItem[],
  deps: ReconcileDeps,
): Promise<ReconciliationResult> {
  const generateId = deps.generateId ?? randomUUID;
  const result: ReconciliationResult = { matched: [], added: [], ambiguous: [] };

  const claimedItemIds = new Set<string>();
  const unmatchedDetections: DetectedItem[] = [];

  // Tier 1: heuristic pass.
  for (const detection of detections) {
    const normName = normalizeName(detection.name);
    const normCategory = normalizeCategory(detection.category);

    const candidate = existingItems.find(
      (item) =>
        !claimedItemIds.has(item.id) &&
        item.normalizedName === normName &&
        (normCategory === null ||
          item.category === null ||
          normalizeCategory(item.category) === normCategory),
    );

    if (candidate) {
      claimedItemIds.add(candidate.id);
      result.matched.push({ detection, itemId: candidate.id, method: "heuristic" });
    } else {
      unmatchedDetections.push(detection);
    }
  }

  if (unmatchedDetections.length === 0) {
    return result;
  }

  // Tier 2: LLM pass over what's left.
  const leftoverItems = existingItems.filter((item) => !claimedItemIds.has(item.id));
  const leftoverItemIds = new Set(leftoverItems.map((item) => item.id));

  const decisions = await deps.llmMatcher.reconcile(
    leftoverItems.map((item) => ({ id: item.id, name: item.name, category: item.category })),
    unmatchedDetections,
  );
  const decisionByIndex = new Map(decisions.map((d) => [d.detectionIndex, d]));

  for (let i = 0; i < unmatchedDetections.length; i++) {
    const detection = unmatchedDetections[i]!;
    const decision = decisionByIndex.get(i);

    if (decision?.decision === "match" && decision.matchedItemId) {
      const targetId = decision.matchedItemId;
      if (leftoverItemIds.has(targetId) && !claimedItemIds.has(targetId)) {
        claimedItemIds.add(targetId);
        result.matched.push({ detection, itemId: targetId, method: "llm" });
      } else {
        // Matcher pointed at an already-claimed or unknown item id -- don't
        // trust it enough to silently merge or fabricate; ask the user.
        result.ambiguous.push({ detection, candidateItemIds: targetId ? [targetId] : [] });
      }
    } else if (decision?.decision === "new") {
      result.added.push({ detection, itemId: generateId() });
    } else if (decision?.decision === "ambiguous") {
      const candidateItemIds = (decision.candidateItemIds ?? []).filter((id) =>
        leftoverItemIds.has(id),
      );
      result.ambiguous.push({ detection, candidateItemIds });
    } else {
      // No decision at all (matcher omitted this index) -- conservative default.
      result.ambiguous.push({ detection, candidateItemIds: [] });
    }
  }

  return result;
}
