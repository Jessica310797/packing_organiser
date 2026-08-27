export interface Trip {
  id: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  activities: string[];
  packingTarget: number | null;
  createdAt: string;
}

export type ItemSource = "vision" | "manual";
export type ItemStatus = "active" | "removed";

export interface InventoryItem {
  id: string;
  tripId: string;
  name: string;
  normalizedName: string;
  category: string | null;
  quantity: number;
  confidence: number | null;
  status: ItemStatus;
  source: ItemSource;
  /** Relative API path to the most recent photo this item was actually detected in, or null (manual items). */
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCandidate {
  id: string;
  tripId: string;
  photoId: string;
  detectedName: string;
  detectedCategory: string | null;
  confidence: number;
  candidateItemIds: string[];
  status: "pending" | "resolved";
  createdAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  filePath: string;
  url: string;
  sequenceNumber: number;
  status: "pending" | "processed" | "failed";
  createdAt: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  normalizedName: string;
  category: string | null;
  quantity: number;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

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

export interface RecommendedItem {
  name: string;
  category: string;
  recommendedQuantity: number;
  packedQuantity: number;
  status: "packed" | "partial" | "missing";
  reasons: string[];
}
