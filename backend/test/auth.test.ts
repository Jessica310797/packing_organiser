import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// A dedicated temp database per test run -- db.ts reads DATABASE_PATH at
// module-load time, so this must be set before anything imports it
// (dynamic import below, not a static one, so ordering is guaranteed).
const dbPath = path.join(os.tmpdir(), `auth-test-${process.pid}-${Date.now()}.db`);
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

// editItem/removeItem never call these for the scenarios under test.
const service = new InventoryService(
  { analyzePhoto: async () => [] },
  { reconcile: async () => [] },
);

let signupCounter = 0;
async function signupUser(name = "Test User") {
  signupCounter += 1;
  return authService.signup(`user${signupCounter}-${Date.now()}@example.com`, "correct-horse-battery", name);
}

describe("authService", () => {
  test("signup then login with the correct password succeeds", async () => {
    const email = `roundtrip-${Date.now()}@example.com`;
    await authService.signup(email, "hunter22222", "Jess");
    const { user, token } = await authService.login(email, "hunter22222");
    assert.equal(user.email, email);
    assert.equal(user.name, "Jess");
    assert.ok(token.length > 0);
  });

  test("login with the wrong password is rejected", async () => {
    const email = `wrongpass-${Date.now()}@example.com`;
    await authService.signup(email, "correct-password", null);
    await assert.rejects(() => authService.login(email, "wrong-password"), authService.InvalidCredentialsError);
  });

  test("login with an unknown email is rejected the same way as a wrong password", async () => {
    await assert.rejects(
      () => authService.login("nobody-here@example.com", "whatever"),
      authService.InvalidCredentialsError,
    );
  });

  test("signup with an already-registered email is rejected", async () => {
    const email = `dupe-${Date.now()}@example.com`;
    await authService.signup(email, "first-password", null);
    await assert.rejects(() => authService.signup(email, "second-password", null), authService.EmailAlreadyRegisteredError);
  });

  test("email matching is case-insensitive", async () => {
    const email = `CaseTest-${Date.now()}@Example.com`;
    await authService.signup(email, "somepassword", null);
    const { user } = await authService.login(email.toLowerCase(), "somepassword");
    assert.equal(user.email, email.toLowerCase());
  });
});

describe("trip ownership isolation", () => {
  test("a user can only see their own trips", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const tripInput = {
      destination: "Lisbon",
      purpose: "Leisure",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      durationDays: 7,
      activities: [] as string[],
    };
    const tripA = tripRepo.createTrip(userA.id, tripInput);
    tripRepo.createTrip(userB.id, tripInput);

    const userAsTrips = tripRepo.listTrips(userA.id);
    assert.equal(userAsTrips.length, 1);
    assert.equal(userAsTrips[0]!.id, tripA.id);

    assert.equal(tripRepo.getTrip(tripA.id, userB.id), undefined);
    assert.ok(tripRepo.getTrip(tripA.id, userA.id));
  });

  test("editItem refuses to edit an item that belongs to a different trip", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const tripInput = {
      destination: "Kyoto",
      purpose: "Leisure",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      durationDays: 7,
      activities: [] as string[],
    };
    const tripA = tripRepo.createTrip(userA.id, tripInput);
    const tripB = tripRepo.createTrip(userB.id, tripInput);

    const item = tripRepo.insertItem({
      id: "item-owned-by-a",
      tripId: tripA.id,
      name: "Passport",
      category: null,
      quantity: 1,
      confidence: null,
      source: "manual",
    });

    // Simulates user B's route already having verified tripB is their own,
    // then trying to edit an item that's actually on tripA.
    const result = service.editItem(tripB.id, item.id, { quantity: 5 });
    assert.equal(result, undefined);

    // The item is untouched.
    const stillOriginal = tripRepo.getItem(item.id);
    assert.equal(stillOriginal?.quantity, 1);

    // The rightful owner can still edit it.
    const edited = service.editItem(tripA.id, item.id, { quantity: 5 });
    assert.equal(edited?.quantity, 5);
  });

  test("resolveReview refuses to act on a review candidate belonging to another user's trip", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const tripA = tripRepo.createTrip(userA.id, {
      destination: "Paris",
      purpose: "Leisure",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      durationDays: 7,
      activities: [],
    });
    const photo = tripRepo.createPhoto(tripA.id, "/tmp/does-not-matter.jpg");
    const candidate = tripRepo.insertReviewCandidate({
      tripId: tripA.id,
      photoId: photo.id,
      detectedName: "Mystery item",
      detectedCategory: null,
      confidence: 0.5,
      candidateItemIds: [],
    });

    assert.throws(() => service.resolveReview(userB.id, candidate.id, { action: "discard" }));
    // The rightful owner can resolve it.
    assert.doesNotThrow(() => service.resolveReview(userA.id, candidate.id, { action: "discard" }));
  });
});

describe("wardrobe ownership isolation", () => {
  test("a user can only see, edit, and remove their own wardrobe items", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const item = wardrobeRepo.addWardrobeItem(userA.id, { name: "Winter coat", category: "clothing", quantity: 1 });

    assert.deepEqual(
      wardrobeRepo.listActiveWardrobeItems(userB.id).map((i) => i.id),
      [],
    );
    assert.ok(wardrobeRepo.listActiveWardrobeItems(userA.id).some((i) => i.id === item.id));

    assert.equal(wardrobeRepo.updateWardrobeItem(item.id, userB.id, { quantity: 9 }), undefined);
    assert.equal(wardrobeRepo.getWardrobeItem(item.id, userA.id)?.quantity, 1);

    wardrobeRepo.removeWardrobeItem(item.id, userB.id);
    assert.ok(wardrobeRepo.getWardrobeItem(item.id, userA.id), "userB's no-op removal must not affect userA's item");

    const updated = wardrobeRepo.updateWardrobeItem(item.id, userA.id, { quantity: 2 });
    assert.equal(updated?.quantity, 2);
  });
});
