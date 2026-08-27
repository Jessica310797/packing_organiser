import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "packing.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    activities TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    confidence REAL,
    status TEXT NOT NULL DEFAULT 'active',
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_items_trip
    ON inventory_items(trip_id, status);

  -- Provenance: which photo(s)/detections contributed to (or were merged into) each item.
  CREATE TABLE IF NOT EXISTS item_observations (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
    detected_name TEXT NOT NULL,
    detected_category TEXT,
    confidence REAL,
    match_method TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Detections the reconciler could not confidently match or add; await user resolution.
  CREATE TABLE IF NOT EXISTS review_candidates (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    detected_name TEXT NOT NULL,
    detected_category TEXT,
    confidence REAL,
    candidate_item_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );
`);

// Lightweight migration for databases created before `purpose` existed.
const tripColumns = db.prepare("PRAGMA table_info(trips)").all() as { name: string }[];
if (!tripColumns.some((c) => c.name === "purpose")) {
  db.exec("ALTER TABLE trips ADD COLUMN purpose TEXT NOT NULL DEFAULT ''");
}
