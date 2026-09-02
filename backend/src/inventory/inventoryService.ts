import { randomUUID } from "node:crypto";
import * as repo from "./repository.js";
import { reconcileDetections, type LLMMatcher } from "./reconciler.js";
import { ensureWardrobeItem } from "../wardrobe/repository.js";
import type { PhotoInput, VisionAnalyzer } from "../vision/visionAnalyzer.js";
import type { InventoryItem, Photo, ReviewCandidate, Trip } from "../types.js";

export interface IngestPhotoResult {
  photo: Photo;
  matchedCount: number;
  addedCount: number;
  ambiguousCount: number;
  inventory: InventoryItem[];
  reviewCandidates: ReviewCandidate[];
}

export type ReviewResolution =
  | { action: "confirm_match"; itemId: string }
  | { action: "confirm_new" }
  | { action: "discard" };

export class InventoryService {
  constructor(
    private visionAnalyzer: VisionAnalyzer,
    private llmMatcher: LLMMatcher,
  ) {}

  createTrip(userId: string, input: repo.CreateTripInput): Trip {
    return repo.createTrip(userId, input);
  }

  /** Scoped to the owning user -- undefined for a trip that doesn't exist OR belongs to someone else. */
  getTrip(id: string, userId: string): Trip | undefined {
    return repo.getTrip(id, userId);
  }

  listTrips(userId: string): Trip[] {
    return repo.listTrips(userId);
  }

  getInventory(tripId: string): InventoryItem[] {
    return repo.listActiveItems(tripId);
  }

  getPhotos(tripId: string): Photo[] {
    return repo.listPhotos(tripId);
  }

  getPhoto(photoId: string): Photo | undefined {
    return repo.getPhoto(photoId);
  }

  getPendingReview(tripId: string): ReviewCandidate[] {
    return repo.listPendingReviewCandidates(tripId);
  }

  /**
   * Ingests one packing photo: runs vision detection, reconciles the results
   * against the trip's current inventory (tier 1 heuristic + tier 2 LLM, see
   * reconciler.ts), and persists matches/additions/ambiguous flags. This is
   * the operation that must never silently double-count an item that was
   * already photographed in an earlier upload for the same trip.
   */
  async ingestPhoto(
    tripId: string,
    userId: string,
    filePath: string,
    photoInput: PhotoInput,
  ): Promise<IngestPhotoResult> {
    const trip = repo.getTrip(tripId, userId);
    if (!trip) throw new Error(`Trip not found: ${tripId}`);

    const photo = repo.createPhoto(tripId, filePath);

    try {
      const detections = await this.visionAnalyzer.analyzePhoto(photoInput);
      const existingItems = repo.listActiveItems(tripId);

      const result = await reconcileDetections(existingItems, detections, {
        llmMatcher: this.llmMatcher,
        generateId: randomUUID,
      });

      for (const { detection, itemId, method } of result.matched) {
        repo.insertObservation({
          itemId,
          photoId: photo.id,
          detectedName: detection.name,
          detectedCategory: detection.category,
          confidence: detection.confidence,
          matchMethod: method,
        });
      }

      for (const { detection, itemId } of result.added) {
        repo.insertItem({
          id: itemId,
          tripId,
          name: detection.name,
          category: detection.category,
          quantity: detection.quantity,
          confidence: detection.confidence,
          source: "vision",
        });
        repo.insertObservation({
          itemId,
          photoId: photo.id,
          detectedName: detection.name,
          detectedCategory: detection.category,
          confidence: detection.confidence,
          matchMethod: "new",
        });
        // A photo-detected item is genuinely owned -- passively build up the
        // wardrobe from what gets packed, same as any other new item.
        ensureWardrobeItem(userId, detection.name, detection.category, detection.quantity);
      }

      const reviewCandidates: ReviewCandidate[] = [];
      for (const { detection, candidateItemIds } of result.ambiguous) {
        reviewCandidates.push(
          repo.insertReviewCandidate({
            tripId,
            photoId: photo.id,
            detectedName: detection.name,
            detectedCategory: detection.category,
            confidence: detection.confidence,
            candidateItemIds,
          }),
        );
      }

      repo.setPhotoStatus(photo.id, "processed");

      return {
        photo: { ...photo, status: "processed" },
        matchedCount: result.matched.length,
        addedCount: result.added.length,
        ambiguousCount: result.ambiguous.length,
        inventory: repo.listActiveItems(tripId),
        reviewCandidates,
      };
    } catch (err) {
      repo.setPhotoStatus(photo.id, "failed");
      throw err;
    }
  }

  addManualItem(
    tripId: string,
    userId: string,
    input: { name: string; category: string | null; quantity: number; packed?: boolean },
  ): InventoryItem {
    const item = repo.insertItem({
      id: randomUUID(),
      tripId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      confidence: null,
      source: "manual",
      packed: input.packed,
    });
    ensureWardrobeItem(userId, input.name, input.category, input.quantity);
    return item;
  }

  /** tripId must be the caller's already-ownership-verified trip -- undefined if the item isn't actually in it. */
  editItem(tripId: string, itemId: string, patch: repo.UpdateItemPatch): InventoryItem | undefined {
    const item = repo.getItem(itemId);
    if (!item || item.tripId !== tripId) return undefined;
    return repo.updateItem(itemId, patch);
  }

  /** tripId must be the caller's already-ownership-verified trip -- no-op if the item isn't actually in it. */
  removeItem(tripId: string, itemId: string): void {
    const item = repo.getItem(itemId);
    if (!item || item.tripId !== tripId) return;
    repo.removeItem(itemId);
  }

  /**
   * Applies a user's decision on a detection the reconciler couldn't resolve
   * on its own. Takes userId directly (rather than a pre-verified tripId)
   * since the route only has a candidateId to start from.
   */
  resolveReview(userId: string, candidateId: string, resolution: ReviewResolution): InventoryItem | undefined {
    const candidate = repo.getReviewCandidate(candidateId);
    if (!candidate) throw new Error(`Review candidate not found: ${candidateId}`);
    if (!repo.getTrip(candidate.tripId, userId)) {
      // Candidate exists but this user doesn't own its trip -- same error as
      // "not found" so we don't reveal that a candidate with this id exists.
      throw new Error(`Review candidate not found: ${candidateId}`);
    }

    let result: InventoryItem | undefined;

    if (resolution.action === "confirm_match") {
      const targetItem = repo.getItem(resolution.itemId);
      if (!targetItem || targetItem.tripId !== candidate.tripId) {
        throw new Error(`Item not found on this trip: ${resolution.itemId}`);
      }
      repo.insertObservation({
        itemId: resolution.itemId,
        photoId: candidate.photoId,
        detectedName: candidate.detectedName,
        detectedCategory: candidate.detectedCategory,
        confidence: candidate.confidence,
        matchMethod: "manual",
      });
      result = repo.getItem(resolution.itemId);
    } else if (resolution.action === "confirm_new") {
      const itemId = randomUUID();
      result = repo.insertItem({
        id: itemId,
        tripId: candidate.tripId,
        name: candidate.detectedName,
        category: candidate.detectedCategory,
        quantity: 1,
        confidence: candidate.confidence,
        source: "vision",
      });
      repo.insertObservation({
        itemId,
        photoId: candidate.photoId,
        detectedName: candidate.detectedName,
        detectedCategory: candidate.detectedCategory,
        confidence: candidate.confidence,
        matchMethod: "manual",
      });
      ensureWardrobeItem(userId, candidate.detectedName, candidate.detectedCategory, 1);
    }
    // "discard": nothing to persist beyond marking the candidate resolved.

    repo.resolveReviewCandidate(candidateId);
    return result;
  }
}
