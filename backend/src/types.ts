export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  destination: string;
  purpose: string; // e.g. "Wedding (Guest)", "Work Trip" -- the higher-level reason for the trip
  startDate: string; // ISO date, e.g. "2026-09-10"
  endDate: string; // ISO date
  durationDays: number;
  activities: string[]; // specific planned activities, e.g. "hiking", "swimming"
  packingTarget: number | null; // optional user-set "how many items am I packing", for a real (not fabricated) progress bar
  createdAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  filePath: string;
  /** Relative API path the client can fetch to display this photo, e.g. as a trip cover thumbnail. */
  url: string;
  sequenceNumber: number;
  status: "pending" | "processed" | "failed";
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

/** A single item detection produced by the vision model for one photo. */
export interface DetectedItem {
  name: string;
  category: string | null;
  quantity: number;
  confidence: number;
}

export type MatchMethod = "heuristic" | "llm" | "manual" | "new";

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

/** Outcome of reconciling one photo's detections against the existing inventory. */
export interface ReconciliationResult {
  matched: { detection: DetectedItem; itemId: string; method: MatchMethod }[];
  added: { detection: DetectedItem; itemId: string }[];
  ambiguous: { detection: DetectedItem; candidateItemIds: string[] }[];
}

/** An item in the user's general closet, independent of any one trip. */
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

/** Which of the three fixed groups a reusable packing list belongs to. */
export type PackingListCategory = "travel_type" | "destination" | "activity";

/** A reusable, user-owned packing list (e.g. "Hiking" under activity), independent of any one trip. */
export interface PackingList {
  id: string;
  category: PackingListCategory;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackingListItem {
  id: string;
  listId: string;
  name: string;
  category: string | null;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}
