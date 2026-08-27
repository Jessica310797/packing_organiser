import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { normalizeCategory, normalizeName } from "../normalize.js";
import type {
  InventoryItem,
  ItemSource,
  MatchMethod,
  Photo,
  ReviewCandidate,
  Trip,
} from "../types.js";

// --- row <-> domain mapping -------------------------------------------------

interface TripRow {
  id: string;
  destination: string;
  purpose: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  activities: string;
  created_at: string;
}

function tripFromRow(row: TripRow): Trip {
  return {
    id: row.id,
    destination: row.destination,
    purpose: row.purpose,
    startDate: row.start_date,
    endDate: row.end_date,
    durationDays: row.duration_days,
    activities: JSON.parse(row.activities) as string[],
    createdAt: row.created_at,
  };
}

interface PhotoRow {
  id: string;
  trip_id: string;
  file_path: string;
  sequence_number: number;
  status: Photo["status"];
  created_at: string;
}

function photoFromRow(row: PhotoRow): Photo {
  return {
    id: row.id,
    tripId: row.trip_id,
    filePath: row.file_path,
    url: `/trips/${row.trip_id}/photos/${row.id}/file`,
    sequenceNumber: row.sequence_number,
    status: row.status,
    createdAt: row.created_at,
  };
}

interface InventoryItemRow {
  id: string;
  trip_id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  quantity: number;
  confidence: number | null;
  status: InventoryItem["status"];
  source: ItemSource;
  created_at: string;
  updated_at: string;
}

function itemFromRow(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    normalizedName: row.normalized_name,
    category: row.category,
    quantity: row.quantity,
    confidence: row.confidence,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ReviewCandidateRow {
  id: string;
  trip_id: string;
  photo_id: string;
  detected_name: string;
  detected_category: string | null;
  confidence: number | null;
  candidate_item_ids: string;
  status: ReviewCandidate["status"];
  created_at: string;
}

function reviewCandidateFromRow(row: ReviewCandidateRow): ReviewCandidate {
  return {
    id: row.id,
    tripId: row.trip_id,
    photoId: row.photo_id,
    detectedName: row.detected_name,
    detectedCategory: row.detected_category,
    confidence: row.confidence ?? 0,
    candidateItemIds: JSON.parse(row.candidate_item_ids) as string[],
    status: row.status,
    createdAt: row.created_at,
  };
}

// --- trips -------------------------------------------------------------------

export interface CreateTripInput {
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  activities: string[];
}

export function createTrip(input: CreateTripInput): Trip {
  const trip: Trip = {
    id: randomUUID(),
    destination: input.destination,
    purpose: input.purpose,
    startDate: input.startDate,
    endDate: input.endDate,
    durationDays: input.durationDays,
    activities: input.activities,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO trips (id, destination, purpose, start_date, end_date, duration_days, activities, created_at)
     VALUES (@id, @destination, @purpose, @startDate, @endDate, @durationDays, @activities, @createdAt)`,
  ).run({ ...trip, activities: JSON.stringify(trip.activities) });
  return trip;
}

export function getTrip(id: string): Trip | undefined {
  const row = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(id) as TripRow | undefined;
  return row ? tripFromRow(row) : undefined;
}

export function listTrips(): Trip[] {
  const rows = db.prepare(`SELECT * FROM trips ORDER BY created_at DESC`).all() as TripRow[];
  return rows.map(tripFromRow);
}

// --- photos --------------------------------------------------------------

export function createPhoto(tripId: string, filePath: string): Photo {
  const { count } = db
    .prepare(`SELECT COUNT(*) as count FROM photos WHERE trip_id = ?`)
    .get(tripId) as { count: number };

  const id = randomUUID();
  const photo: Photo = {
    id,
    tripId,
    filePath,
    url: `/trips/${tripId}/photos/${id}/file`,
    sequenceNumber: count + 1,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO photos (id, trip_id, file_path, sequence_number, status, created_at)
     VALUES (@id, @tripId, @filePath, @sequenceNumber, @status, @createdAt)`,
  ).run(photo);
  return photo;
}

export function setPhotoStatus(id: string, status: Photo["status"]): void {
  db.prepare(`UPDATE photos SET status = ? WHERE id = ?`).run(status, id);
}

export function getPhoto(id: string): Photo | undefined {
  const row = db.prepare(`SELECT * FROM photos WHERE id = ?`).get(id) as PhotoRow | undefined;
  return row ? photoFromRow(row) : undefined;
}

export function listPhotos(tripId: string): Photo[] {
  const rows = db
    .prepare(`SELECT * FROM photos WHERE trip_id = ? ORDER BY sequence_number ASC`)
    .all(tripId) as PhotoRow[];
  return rows.map(photoFromRow);
}

// --- inventory items -------------------------------------------------------

export function listActiveItems(tripId: string): InventoryItem[] {
  const rows = db
    .prepare(`SELECT * FROM inventory_items WHERE trip_id = ? AND status = 'active' ORDER BY created_at ASC`)
    .all(tripId) as InventoryItemRow[];
  return rows.map(itemFromRow);
}

export function getItem(id: string): InventoryItem | undefined {
  const row = db.prepare(`SELECT * FROM inventory_items WHERE id = ?`).get(id) as
    | InventoryItemRow
    | undefined;
  return row ? itemFromRow(row) : undefined;
}

export interface InsertItemInput {
  id: string;
  tripId: string;
  name: string;
  category: string | null;
  quantity: number;
  confidence: number | null;
  source: ItemSource;
}

export function insertItem(input: InsertItemInput): InventoryItem {
  const now = new Date().toISOString();
  const item: InventoryItem = {
    id: input.id,
    tripId: input.tripId,
    name: input.name,
    normalizedName: normalizeName(input.name),
    category: normalizeCategory(input.category),
    quantity: input.quantity,
    confidence: input.confidence,
    status: "active",
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO inventory_items
       (id, trip_id, name, normalized_name, category, quantity, confidence, status, source, created_at, updated_at)
     VALUES (@id, @tripId, @name, @normalizedName, @category, @quantity, @confidence, @status, @source, @createdAt, @updatedAt)`,
  ).run(item);
  return item;
}

export interface UpdateItemPatch {
  name?: string;
  category?: string | null;
  quantity?: number;
}

export function updateItem(id: string, patch: UpdateItemPatch): InventoryItem | undefined {
  const existing = getItem(id);
  if (!existing) return undefined;

  const name = patch.name ?? existing.name;
  const category = patch.category !== undefined ? normalizeCategory(patch.category) : existing.category;
  const quantity = patch.quantity ?? existing.quantity;

  db.prepare(
    `UPDATE inventory_items
     SET name = ?, normalized_name = ?, category = ?, quantity = ?, source = 'manual', updated_at = ?
     WHERE id = ?`,
  ).run(name, normalizeName(name), category, quantity, new Date().toISOString(), id);

  return getItem(id);
}

export function removeItem(id: string): void {
  db.prepare(`UPDATE inventory_items SET status = 'removed', updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    id,
  );
}

// --- observations (provenance) ---------------------------------------------

export interface InsertObservationInput {
  itemId: string;
  photoId: string | null;
  detectedName: string;
  detectedCategory: string | null;
  confidence: number | null;
  matchMethod: MatchMethod;
}

export function insertObservation(input: InsertObservationInput): void {
  db.prepare(
    `INSERT INTO item_observations
       (id, item_id, photo_id, detected_name, detected_category, confidence, match_method, created_at)
     VALUES (@id, @itemId, @photoId, @detectedName, @detectedCategory, @confidence, @matchMethod, @createdAt)`,
  ).run({
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  });
}

// --- review candidates ------------------------------------------------------

export interface InsertReviewCandidateInput {
  tripId: string;
  photoId: string;
  detectedName: string;
  detectedCategory: string | null;
  confidence: number | null;
  candidateItemIds: string[];
}

export function insertReviewCandidate(input: InsertReviewCandidateInput): ReviewCandidate {
  const candidate: ReviewCandidate = {
    id: randomUUID(),
    tripId: input.tripId,
    photoId: input.photoId,
    detectedName: input.detectedName,
    detectedCategory: input.detectedCategory,
    confidence: input.confidence ?? 0,
    candidateItemIds: input.candidateItemIds,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO review_candidates
       (id, trip_id, photo_id, detected_name, detected_category, confidence, candidate_item_ids, status, created_at)
     VALUES (@id, @tripId, @photoId, @detectedName, @detectedCategory, @confidence, @candidateItemIds, @status, @createdAt)`,
  ).run({ ...candidate, candidateItemIds: JSON.stringify(candidate.candidateItemIds) });
  return candidate;
}

export function listPendingReviewCandidates(tripId: string): ReviewCandidate[] {
  const rows = db
    .prepare(`SELECT * FROM review_candidates WHERE trip_id = ? AND status = 'pending' ORDER BY created_at ASC`)
    .all(tripId) as ReviewCandidateRow[];
  return rows.map(reviewCandidateFromRow);
}

export function getReviewCandidate(id: string): ReviewCandidate | undefined {
  const row = db.prepare(`SELECT * FROM review_candidates WHERE id = ?`).get(id) as
    | ReviewCandidateRow
    | undefined;
  return row ? reviewCandidateFromRow(row) : undefined;
}

export function resolveReviewCandidate(id: string): void {
  db.prepare(`UPDATE review_candidates SET status = 'resolved' WHERE id = ?`).run(id);
}
