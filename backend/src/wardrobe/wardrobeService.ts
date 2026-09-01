import { normalizeName } from "../normalize.js";
import type { PhotoInput, VisionAnalyzer } from "../vision/visionAnalyzer.js";
import type { WardrobeItem } from "../types.js";
import * as repo from "./repository.js";

export interface WardrobePhotoResult {
  added: WardrobeItem[];
  duplicateCount: number;
}

export class WardrobeService {
  constructor(private visionAnalyzer: VisionAnalyzer) {}

  /**
   * Detects items in a photo and adds each one that isn't already in the
   * wardrobe (heuristic exact-normalized-name match only -- there's no
   * per-trip photo sequence to reconcile against here, so the LLM/review-
   * queue tier the trip pipeline uses would be overkill). A detection that
   * matches an existing item is skipped, not merged or quantity-bumped;
   * correcting quantities is left to the manual edit controls.
   */
  async ingestPhoto(userId: string, photo: PhotoInput): Promise<WardrobePhotoResult> {
    const detections = await this.visionAnalyzer.analyzePhoto(photo);
    const knownNames = new Set(repo.listActiveWardrobeItems(userId).map((item) => item.normalizedName));

    const added: WardrobeItem[] = [];
    let duplicateCount = 0;

    for (const detection of detections) {
      const key = normalizeName(detection.name);
      if (knownNames.has(key)) {
        duplicateCount += 1;
        continue;
      }
      const item = repo.addWardrobeItem(userId, {
        name: detection.name,
        category: detection.category,
        quantity: detection.quantity,
      });
      added.push(item);
      knownNames.add(key);
    }

    return { added, duplicateCount };
  }
}
