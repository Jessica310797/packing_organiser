import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const dbPath = path.join(os.tmpdir(), `packing-lists-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;

const authService = await import("../src/auth/authService.js");
const repo = await import("../src/packingLists/repository.js");
const { findStarterItems } = await import("../src/recommendations/packingTemplates.js");
const { suggestionsFor } = await import("../src/routes/packingLists.js");

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
  return authService.signup(`plist-user${signupCounter}-${Date.now()}@example.com`, "correct-horse-battery", null);
}

describe("packing lists CRUD", () => {
  test("create, list, rename, delete a list", async () => {
    const { user } = await signupUser();

    const created = repo.createPackingList(user.id, "activity", "Hiking");
    assert.equal(created.category, "activity");
    assert.equal(created.name, "Hiking");

    const listed = repo.listPackingLists(user.id);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]!.id, created.id);

    const renamed = repo.renamePackingList(created.id, user.id, "Big Hikes");
    assert.equal(renamed?.name, "Big Hikes");

    repo.deletePackingList(created.id, user.id);
    assert.equal(repo.getPackingList(created.id, user.id), undefined);
  });

  test("items can be added, updated, and removed within a list", async () => {
    const { user } = await signupUser();
    const list = repo.createPackingList(user.id, "destination", "Custom Destination");

    const item = repo.addPackingListItem(list.id, { name: "Passport", category: "Documents", quantity: 1 });
    assert.equal(repo.listPackingListItems(list.id).length, 1);

    const updated = repo.updatePackingListItem(item.id, { quantity: 2 });
    assert.equal(updated?.quantity, 2);

    repo.removePackingListItem(item.id);
    assert.equal(repo.listPackingListItems(list.id).length, 0);
  });
});

describe("packing lists ownership isolation", () => {
  test("a user can only see and modify their own lists", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();

    const listA = repo.createPackingList(userA.id, "travel_type", "Plane");

    assert.equal(repo.getPackingList(listA.id, userB.id), undefined);
    assert.deepEqual(
      repo.listPackingLists(userB.id).map((l) => l.id),
      [],
    );

    // userB's rename/delete against userA's list must no-op, not affect it.
    assert.equal(repo.renamePackingList(listA.id, userB.id, "Hijacked"), undefined);
    assert.equal(repo.getPackingList(listA.id, userA.id)?.name, "Plane");

    repo.deletePackingList(listA.id, userB.id);
    assert.ok(repo.getPackingList(listA.id, userA.id), "userB's no-op delete must not affect userA's list");
  });
});

describe("live suggestions for an existing list", () => {
  test("suggests starter items not yet on the list", () => {
    const suggestions = suggestionsFor("activity", "Hiking", []);
    assert.ok(suggestions.some((s) => s.name === "Hiking boots"));
  });

  test("excludes an item already on the list, by normalized name", () => {
    const existing = [
      {
        id: "item-1",
        listId: "list-1",
        name: "hiking boots",
        category: "footwear",
        quantity: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const suggestions = suggestionsFor("activity", "Hiking", existing);
    assert.ok(!suggestions.some((s) => s.name === "Hiking boots"));
    // Everything else Hiking recommends is still worth suggesting.
    assert.ok(suggestions.length > 0);
  });

  test("a custom list name with no template match has no suggestions", () => {
    assert.deepEqual(suggestionsFor("activity", "Not A Real Activity", []), []);
  });
});

describe("starter item templates", () => {
  test("a known activity name resolves starter items", () => {
    const items = findStarterItems("activity", "Hiking");
    assert.ok(items.some((i) => i.name === "Hiking boots"));
  });

  test("a known travel type name resolves starter items", () => {
    const items = findStarterItems("travel_type", "Plane");
    assert.ok(items.some((i) => i.name === "Travel pillow"));
  });

  test("destination category falls back to purpose templates", () => {
    const items = findStarterItems("destination", "Beach Holiday");
    assert.ok(items.some((i) => i.name === "Swimwear"));
  });

  test("a custom name with no template match returns no starter items", () => {
    assert.deepEqual(findStarterItems("activity", "Not A Real Activity"), []);
    assert.deepEqual(findStarterItems("destination", "Somewhere Made Up"), []);
  });
});
