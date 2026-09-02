import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.tmpdir(), `inventory-service-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;

const authService = await import("../src/auth/authService.js");
const tripRepo = await import("../src/inventory/repository.js");
const wardrobeRepo = await import("../src/wardrobe/repository.js");
const { InventoryService } = await import("../src/inventory/inventoryService.js");

after(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {
      // already gone, fine
    }
  }
});

const service = new InventoryService(
  { analyzePhoto: async () => [] },
  { reconcile: async () => [] },
);

let signupCounter = 0;
async function signupUserWithTrip() {
  signupCounter += 1;
  const { user } = await authService.signup(
    `inventory-service-${signupCounter}-${Date.now()}@example.com`,
    "correct-horse-battery",
    null,
  );
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

describe("InventoryService.addManualItem -- packed vs to-pack", () => {
  test("defaults to packed when not specified", async () => {
    const { user, trip } = await signupUserWithTrip();
    const item = service.addManualItem(trip.id, user.id, { name: "Passport", category: null, quantity: 1 });
    assert.equal(item.packed, true);
  });

  test("can be added as not-yet-packed", async () => {
    const { user, trip } = await signupUserWithTrip();
    const item = service.addManualItem(trip.id, user.id, {
      name: "Hiking boots",
      category: "Footwear",
      quantity: 1,
      packed: false,
    });
    assert.equal(item.packed, false);
  });

  test("un-packing an item keeps it (moves to to-pack) instead of deleting it", async () => {
    const { user, trip } = await signupUserWithTrip();
    const item = service.addManualItem(trip.id, user.id, { name: "Passport", category: null, quantity: 1 });

    const unpacked = service.editItem(trip.id, item.id, { packed: false });
    assert.equal(unpacked?.packed, false);

    // Still present in the trip's active inventory -- not soft-deleted.
    const stillThere = service.getInventory(trip.id).find((i) => i.id === item.id);
    assert.ok(stillThere, "un-packing must not remove the item from inventory");
    assert.equal(stillThere?.packed, false);

    // Packing it back flips it again, still the same item.
    const repacked = service.editItem(trip.id, item.id, { packed: true });
    assert.equal(repacked?.packed, true);
  });
});

describe("InventoryService -- wardrobe auto-sync", () => {
  test("adding a manual item also adds it to the user's wardrobe", async () => {
    const { user, trip } = await signupUserWithTrip();
    assert.deepEqual(wardrobeRepo.listActiveWardrobeItems(user.id), []);

    service.addManualItem(trip.id, user.id, { name: "Navy blazer", category: "Clothing", quantity: 1 });

    const wardrobe = wardrobeRepo.listActiveWardrobeItems(user.id);
    assert.equal(wardrobe.length, 1);
    assert.equal(wardrobe[0]!.name, "Navy blazer");
  });

  test("does not create a duplicate wardrobe entry for the same item packed on another trip", async () => {
    const { user, trip: tripA } = await signupUserWithTrip();
    const tripB = tripRepo.createTrip(user.id, {
      destination: "Rome",
      purpose: "Leisure",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      durationDays: 4,
      activities: [],
    });

    service.addManualItem(tripA.id, user.id, { name: "Navy blazer", category: "Clothing", quantity: 1 });
    service.addManualItem(tripB.id, user.id, { name: "navy blazer", category: "Clothing", quantity: 1 });

    assert.equal(wardrobeRepo.listActiveWardrobeItems(user.id).length, 1);
  });

  test("a photo-detected new item also syncs to the wardrobe", async () => {
    const { user, trip } = await signupUserWithTrip();
    const visionService = new InventoryService(
      {
        analyzePhoto: async () => [
          { name: "Striped scarf", category: "Accessories", quantity: 1, confidence: 0.9 },
        ],
      },
      { reconcile: async (_items, detections) => detections.map((_, i) => ({ detectionIndex: i, decision: "new" as const })) },
    );

    await visionService.ingestPhoto(trip.id, user.id, "/tmp/does-not-matter.jpg", {
      imageBase64: "x",
      mediaType: "image/jpeg",
    });

    const wardrobe = wardrobeRepo.listActiveWardrobeItems(user.id);
    assert.ok(wardrobe.some((i) => i.name === "Striped scarf"));
  });
});
