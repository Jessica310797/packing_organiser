import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { normalizeCategory, normalizeName } from "../normalize.js";
import type { WardrobeItem } from "../types.js";

interface WardrobeItemRow {
  id: string;
  user_id: string;
  name: string;
  normalized_name: string;
  category: string | null;
  quantity: number;
  status: WardrobeItem["status"];
  created_at: string;
  updated_at: string;
}

function fromRow(row: WardrobeItemRow): WardrobeItem {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    category: row.category,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listActiveWardrobeItems(userId: string): WardrobeItem[] {
  const rows = db
    .prepare(`SELECT * FROM wardrobe_items WHERE user_id = ? AND status = 'active' ORDER BY created_at ASC`)
    .all(userId) as WardrobeItemRow[];
  return rows.map(fromRow);
}

/** Scoped to the owning user -- undefined for an item that doesn't exist OR belongs to someone else. */
export function getWardrobeItem(id: string, userId: string): WardrobeItem | undefined {
  const row = db.prepare(`SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?`).get(id, userId) as
    | WardrobeItemRow
    | undefined;
  return row ? fromRow(row) : undefined;
}

export interface AddWardrobeItemInput {
  name: string;
  category: string | null;
  quantity: number;
}

export function addWardrobeItem(userId: string, input: AddWardrobeItemInput): WardrobeItem {
  const now = new Date().toISOString();
  const item: WardrobeItem = {
    id: randomUUID(),
    name: input.name,
    normalizedName: normalizeName(input.name),
    category: normalizeCategory(input.category),
    quantity: input.quantity,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO wardrobe_items (id, user_id, name, normalized_name, category, quantity, status, created_at, updated_at)
     VALUES (@id, @userId, @name, @normalizedName, @category, @quantity, @status, @createdAt, @updatedAt)`,
  ).run({ ...item, userId });
  return item;
}

export interface UpdateWardrobeItemPatch {
  name?: string;
  category?: string | null;
  quantity?: number;
}

export function updateWardrobeItem(
  id: string,
  userId: string,
  patch: UpdateWardrobeItemPatch,
): WardrobeItem | undefined {
  const existing = getWardrobeItem(id, userId);
  if (!existing) return undefined;

  const name = patch.name ?? existing.name;
  const category = patch.category !== undefined ? normalizeCategory(patch.category) : existing.category;
  const quantity = patch.quantity ?? existing.quantity;

  db.prepare(
    `UPDATE wardrobe_items
     SET name = ?, normalized_name = ?, category = ?, quantity = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(name, normalizeName(name), category, quantity, new Date().toISOString(), id, userId);

  return getWardrobeItem(id, userId);
}

export function removeWardrobeItem(id: string, userId: string): void {
  db.prepare(`UPDATE wardrobe_items SET status = 'removed', updated_at = ? WHERE id = ? AND user_id = ?`).run(
    new Date().toISOString(),
    id,
    userId,
  );
}
