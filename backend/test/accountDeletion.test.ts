import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.tmpdir(), `account-deletion-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;

const authService = await import("../src/auth/authService.js");
const tripRepo = await import("../src/inventory/repository.js");
const wardrobeRepo = await import("../src/wardrobe/repository.js");
const packingListRepo = await import("../src/packingLists/repository.js");

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
  return authService.signup(`delete-me-${signupCounter}-${Date.now()}@example.com`, "correct-horse-battery", null);
}

describe("authService.deleteAccount", () => {
  test("removes the user's trips, wardrobe items, and packing lists", async () => {
    const { user } = await signupUser();

    const trip = tripRepo.createTrip(user.id, {
      destination: "Lisbon",
      purpose: "Leisure",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      durationDays: 7,
      activities: [],
    });
    const item = tripRepo.insertItem({
      id: "item-to-delete",
      tripId: trip.id,
      name: "Passport",
      category: null,
      quantity: 1,
      confidence: null,
      source: "manual",
    });
    wardrobeRepo.addWardrobeItem(user.id, { name: "Winter coat", category: "clothing", quantity: 1 });
    const list = packingListRepo.createPackingList(user.id, "activity", "Hiking");

    authService.deleteAccount(user.id);

    assert.equal(tripRepo.getTrip(trip.id, user.id), undefined);
    assert.equal(tripRepo.getItem(item.id), undefined);
    assert.deepEqual(wardrobeRepo.listActiveWardrobeItems(user.id), []);
    assert.equal(packingListRepo.getPackingList(list.id, user.id), undefined);
  });

  test("deletes the uploaded photo files for the account's trips from disk", async () => {
    const { user } = await signupUser();
    const trip = tripRepo.createTrip(user.id, {
      destination: "Rome",
      purpose: "Leisure",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      durationDays: 4,
      activities: [],
    });

    const photoPath = path.join(os.tmpdir(), `fake-photo-${Date.now()}.jpg`);
    fs.writeFileSync(photoPath, "not a real image, just needs to exist");
    tripRepo.createPhoto(trip.id, photoPath);

    assert.ok(fs.existsSync(photoPath), "test setup: photo file should exist before deletion");

    authService.deleteAccount(user.id);

    assert.ok(!fs.existsSync(photoPath), "photo file should be removed from disk after account deletion");
  });

  test("does not affect another user's data", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const tripB = tripRepo.createTrip(userB.id, {
      destination: "Berlin",
      purpose: "Leisure",
      startDate: "2026-11-01",
      endDate: "2026-11-05",
      durationDays: 4,
      activities: [],
    });

    authService.deleteAccount(userA.id);

    assert.ok(tripRepo.getTrip(tripB.id, userB.id), "userB's trip must survive userA's account deletion");
  });
});
