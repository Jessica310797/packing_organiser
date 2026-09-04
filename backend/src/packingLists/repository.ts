import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { normalizeCategory } from "../normalize.js";
import type { PackingList, PackingListCategory, PackingListItem } from "../types.js";

interface PackingListRow {
  id: string;
  user_id: string;
  category: PackingListCategory;
  name: string;
  created_at: string;
  updated_at: string;
}

function listFromRow(row: PackingListRow): PackingList {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PackingListItemRow {
  id: string;
  list_id: string;
  name: string;
  category: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

function itemFromRow(row: PackingListItemRow): PackingListItem {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- lists -------------------------------------------------------------

export function listPackingLists(userId: string): PackingList[] {
  const rows = db
    .prepare(`SELECT * FROM packing_lists WHERE user_id = ? ORDER BY created_at ASC`)
    .all(userId) as PackingListRow[];
  return rows.map(listFromRow);
}

/** Scoped to the owning user -- undefined for a list that doesn't exist OR belongs to someone else. */
export function getPackingList(id: string, userId: string): PackingList | undefined {
  const row = db.prepare(`SELECT * FROM packing_lists WHERE id = ? AND user_id = ?`).get(id, userId) as
    | PackingListRow
    | undefined;
  return row ? listFromRow(row) : undefined;
}

export function createPackingList(userId: string, category: PackingListCategory, name: string): PackingList {
  const now = new Date().toISOString();
  const list: PackingList = { id: randomUUID(), category, name, createdAt: now, updatedAt: now };
  db.prepare(
    `INSERT INTO packing_lists (id, user_id, category, name, created_at, updated_at)
     VALUES (@id, @userId, @category, @name, @createdAt, @updatedAt)`,
  ).run({ ...list, userId });
  return list;
}

export function renamePackingList(id: string, userId: string, name: string): PackingList | undefined {
  db.prepare(`UPDATE packing_lists SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?`).run(
    name,
    new Date().toISOString(),
    id,
    userId,
  );
  return getPackingList(id, userId);
}

export function deletePackingList(id: string, userId: string): void {
  db.prepare(`DELETE FROM packing_lists WHERE id = ? AND user_id = ?`).run(id, userId);
}

// --- items ---------------------------------------------------------------

export function listPackingListItems(listId: string): PackingListItem[] {
  const rows = db
    .prepare(`SELECT * FROM packing_list_items WHERE list_id = ? ORDER BY created_at ASC`)
    .all(listId) as PackingListItemRow[];
  return rows.map(itemFromRow);
}

export function getPackingListItem(id: string): PackingListItem | undefined {
  const row = db.prepare(`SELECT * FROM packing_list_items WHERE id = ?`).get(id) as
    | PackingListItemRow
    | undefined;
  return row ? itemFromRow(row) : undefined;
}

export interface AddPackingListItemInput {
  name: string;
  category: string | null;
  quantity: number;
}

export function addPackingListItem(listId: string, input: AddPackingListItemInput): PackingListItem {
  const now = new Date().toISOString();
  const item: PackingListItem = {
    id: randomUUID(),
    listId,
    name: input.name,
    category: normalizeCategory(input.category),
    quantity: input.quantity,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO packing_list_items (id, list_id, name, category, quantity, created_at, updated_at)
     VALUES (@id, @listId, @name, @category, @quantity, @createdAt, @updatedAt)`,
  ).run(item);
  return item;
}

export interface UpdatePackingListItemPatch {
  name?: string;
  category?: string | null;
  quantity?: number;
}

export function updatePackingListItem(id: string, patch: UpdatePackingListItemPatch): PackingListItem | undefined {
  const existing = getPackingListItem(id);
  if (!existing) return undefined;

  const name = patch.name ?? existing.name;
  const category = patch.category !== undefined ? normalizeCategory(patch.category) : existing.category;
  const quantity = patch.quantity ?? existing.quantity;

  db.prepare(
    `UPDATE packing_list_items SET name = ?, category = ?, quantity = ?, updated_at = ? WHERE id = ?`,
  ).run(name, category, quantity, new Date().toISOString(), id);

  return getPackingListItem(id);
}

export function removePackingListItem(id: string): void {
  db.prepare(`DELETE FROM packing_list_items WHERE id = ?`).run(id);
}
