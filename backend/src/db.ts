import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "packing.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    activities TEXT NOT NULL DEFAULT '[]',
    packing_target INTEGER,
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
    -- Whether this item is actually packed yet, vs. just on the list to
    -- pack -- see the "packed vs to-pack" distinction in inventoryService.
    packed INTEGER NOT NULL DEFAULT 1,
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

  -- A user's general closet, independent of any one trip: what they own,
  -- manually maintained for now. Future work: seed packing recommendations
  -- for new trips from this.
  CREATE TABLE IF NOT EXISTS wardrobe_items (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Reusable packing lists a user builds once and reuses across trips,
  -- grouped into three fixed categories (see PackingListCategory).
  CREATE TABLE IF NOT EXISTS packing_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_packing_lists_user ON packing_lists(user_id);

  CREATE TABLE IF NOT EXISTS packing_list_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_packing_list_items_list ON packing_list_items(list_id);

`);

// Lightweight migration for databases created before `purpose` existed.
const tripColumns = db.prepare("PRAGMA table_info(trips)").all() as { name: string }[];
if (!tripColumns.some((c) => c.name === "purpose")) {
  db.exec("ALTER TABLE trips ADD COLUMN purpose TEXT NOT NULL DEFAULT ''");
}
if (!tripColumns.some((c) => c.name === "packing_target")) {
  db.exec("ALTER TABLE trips ADD COLUMN packing_target INTEGER");
}
// user_id is nullable here purely for the migration step -- rows from before
// accounts existed have no owner and become inaccessible under the new
// per-user scoping (expected for dev data; there's no user to attribute
// them to). Every row created after this point always has a real user_id.
if (!tripColumns.some((c) => c.name === "user_id")) {
  db.exec("ALTER TABLE trips ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
}
// Run unconditionally (and only after the column above is guaranteed to
// exist, whether from this ALTER or from the original CREATE TABLE) --
// IF NOT EXISTS makes this safe to repeat on every startup.
db.exec("CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id)");

const inventoryItemColumns = db.prepare("PRAGMA table_info(inventory_items)").all() as { name: string }[];
if (!inventoryItemColumns.some((c) => c.name === "packed")) {
  // Existing rows predate the packed/to-pack distinction -- treat them as
  // already packed (the only state that existed before), not as newly
  // "to pack", so nothing already-packed visually regresses on upgrade.
  db.exec("ALTER TABLE inventory_items ADD COLUMN packed INTEGER NOT NULL DEFAULT 1");
}

const wardrobeColumns = db.prepare("PRAGMA table_info(wardrobe_items)").all() as { name: string }[];
if (!wardrobeColumns.some((c) => c.name === "user_id")) {
  db.exec("ALTER TABLE wardrobe_items ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE");
}
db.exec("CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user ON wardrobe_items(user_id)");
