export interface Trip {
  id: string;
  destination: string;
  purpose: string; // e.g. "Wedding (Guest)", "Work Trip" -- the higher-level reason for the trip
  startDate: string; // ISO date, e.g. "2026-09-10"
  endDate: string; // ISO date
  durationDays: number;
  activities: string[]; // specific planned activities, e.g. "hiking", "swimming"
  createdAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  filePath: string;
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
