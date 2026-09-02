import { db } from "../db.js";

/** "YYYY-MM" in UTC, so usage resets on the 1st regardless of server timezone. */
export function monthKeyFor(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthlyPhotoScanCount(userId: string, month: string = monthKeyFor()): number {
  const row = db
    .prepare(`SELECT count FROM photo_scan_usage WHERE user_id = ? AND month = ?`)
    .get(userId, month) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function incrementMonthlyPhotoScanCount(userId: string, month: string = monthKeyFor()): void {
  db.prepare(
    `INSERT INTO photo_scan_usage (user_id, month, count) VALUES (?, ?, 1)
     ON CONFLICT(user_id, month) DO UPDATE SET count = count + 1`,
  ).run(userId, month);
}
