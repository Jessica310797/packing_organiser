import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.tmpdir(), `rate-limiter-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;
// Kept small so tests hit the limit in a couple of calls instead of 30.
process.env.PHOTO_SCAN_MONTHLY_LIMIT = "2";

const authService = await import("../src/auth/authService.js");
const tripRepo = await import("../src/inventory/repository.js");
const usageRepo = await import("../src/usage/repository.js");
const { consumePhotoScan, PhotoScanLimitExceededError } = await import("../src/usage/rateLimiter.js");
const { InventoryService } = await import("../src/inventory/inventoryService.js");
const { WardrobeService } = await import("../src/wardrobe/wardrobeService.js");

after(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {
      // already gone, fine
    }
  }
});

let signupCounter = 0;
async function signupUser() {
  signupCounter += 1;
  return authService.signup(`rate-limit-${signupCounter}-${Date.now()}@example.com`, "correct-horse-battery", null);
}

async function signupUserWithTrip() {
  const { user } = await signupUser();
  const trip = tripRepo.createTrip(user.id, {
    destination: "Lisbon",
    purpose: "Leisure",
    startDate: "2026-09-10",
    endDate: "2026-09-17",
    durationDays: 7,
    activities: [],
  });
  return { user, trip };
}

const emptyPhoto = { imageBase64: "x", mediaType: "image/jpeg" } as const;

describe("usage/repository", () => {
  test("monthKeyFor formats as YYYY-MM in UTC", () => {
    assert.equal(usageRepo.monthKeyFor(new Date(Date.UTC(2026, 0, 15))), "2026-01");
    assert.equal(usageRepo.monthKeyFor(new Date(Date.UTC(2026, 8, 2))), "2026-09");
  });

  test("counts increment per user per month, independent of other months", async () => {
    const { user } = await signupUser();
    assert.equal(usageRepo.getMonthlyPhotoScanCount(user.id, "2026-05"), 0);
    usageRepo.incrementMonthlyPhotoScanCount(user.id, "2026-05");
    usageRepo.incrementMonthlyPhotoScanCount(user.id, "2026-05");
    assert.equal(usageRepo.getMonthlyPhotoScanCount(user.id, "2026-05"), 2);
    assert.equal(usageRepo.getMonthlyPhotoScanCount(user.id, "2026-06"), 0);
  });
});

describe("rateLimiter.consumePhotoScan", () => {
  test("allows calls up to the monthly limit, then throws", async () => {
    const { user } = await signupUser();
    consumePhotoScan(user.id);
    consumePhotoScan(user.id);
    assert.throws(() => consumePhotoScan(user.id), PhotoScanLimitExceededError);
  });

  test("error message names the configured limit", async () => {
    const { user } = await signupUser();
    consumePhotoScan(user.id);
    consumePhotoScan(user.id);
    try {
      consumePhotoScan(user.id);
      assert.fail("expected PhotoScanLimitExceededError");
    } catch (err) {
      assert.ok(err instanceof PhotoScanLimitExceededError);
      assert.match((err as Error).message, /2 photo scans/);
    }
  });
});

describe("photo scan limit enforced end-to-end", () => {
  test("trip photo ingestion is blocked once the monthly limit is reached", async () => {
    const { user, trip } = await signupUserWithTrip();
    const service = new InventoryService({ analyzePhoto: async () => [] }, { reconcile: async () => [] });

    await service.ingestPhoto(trip.id, user.id, "/tmp/a.jpg", emptyPhoto);
    await service.ingestPhoto(trip.id, user.id, "/tmp/b.jpg", emptyPhoto);
    await assert.rejects(
      () => service.ingestPhoto(trip.id, user.id, "/tmp/c.jpg", emptyPhoto),
      PhotoScanLimitExceededError,
    );
  });

  test("a trip the user doesn't own/doesn't exist fails before consuming quota", async () => {
    const { user } = await signupUser();
    const service = new InventoryService({ analyzePhoto: async () => [] }, { reconcile: async () => [] });

    await assert.rejects(() => service.ingestPhoto("nonexistent-trip", user.id, "/tmp/a.jpg", emptyPhoto));
    assert.equal(usageRepo.getMonthlyPhotoScanCount(user.id), 0);
  });

  test("trip photos and wardrobe photos share the same monthly quota", async () => {
    const { user, trip } = await signupUserWithTrip();
    const inventoryService = new InventoryService({ analyzePhoto: async () => [] }, { reconcile: async () => [] });
    const wardrobeService = new WardrobeService({ analyzePhoto: async () => [] });

    await inventoryService.ingestPhoto(trip.id, user.id, "/tmp/a.jpg", emptyPhoto);
    await wardrobeService.ingestPhoto(user.id, emptyPhoto);
    await assert.rejects(
      () => inventoryService.ingestPhoto(trip.id, user.id, "/tmp/b.jpg", emptyPhoto),
      PhotoScanLimitExceededError,
    );
  });
});
