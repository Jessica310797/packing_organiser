import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { DetectedItem } from "../src/types.js";
import type { PhotoInput, VisionAnalyzer } from "../src/vision/visionAnalyzer.js";

const dbPath = path.join(os.tmpdir(), `wardrobe-service-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = dbPath;

const authService = await import("../src/auth/authService.js");
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

function fakeAnalyzer(items: DetectedItem[]): VisionAnalyzer {
  return {
    analyzePhoto: async (_input: PhotoInput) => items,
  };
}

let signupCounter = 0;
async function signupUser() {
  signupCounter += 1;
  return authService.signup(`wardrobe-photo-${signupCounter}-${Date.now()}@example.com`, "correct-horse-battery", null);
}

describe("WardrobeService.ingestPhoto", () => {
  test("adds every newly detected item", async () => {
    const { user } = await signupUser();
    const service = new WardrobeService(
      fakeAnalyzer([
        { name: "Navy blazer", category: "clothing", quantity: 1, confidence: 0.9 },
        { name: "Brown leather boots", category: "footwear", quantity: 1, confidence: 0.8 },
      ]),
    );

    const result = await service.ingestPhoto(user.id, { imageBase64: "x", mediaType: "image/jpeg" });
    assert.equal(result.added.length, 2);
    assert.equal(result.duplicateCount, 0);
    assert.deepEqual(
      result.added.map((i) => i.name).sort(),
      ["Brown leather boots", "Navy blazer"],
    );
  });

  test("skips a detection that already matches an existing wardrobe item by normalized name", async () => {
    const { user } = await signupUser();
    const wardrobeRepo = await import("../src/wardrobe/repository.js");
    wardrobeRepo.addWardrobeItem(user.id, { name: "Navy Blazer", category: "clothing", quantity: 1 });

    const service = new WardrobeService(
      fakeAnalyzer([{ name: "navy blazer", category: "clothing", quantity: 1, confidence: 0.9 }]),
    );

    const result = await service.ingestPhoto(user.id, { imageBase64: "x", mediaType: "image/jpeg" });
    assert.equal(result.added.length, 0);
    assert.equal(result.duplicateCount, 1);
  });

  test("does not add the same detected item twice within one photo", async () => {
    const { user } = await signupUser();
    const service = new WardrobeService(
      fakeAnalyzer([
        { name: "White socks", category: "clothing", quantity: 1, confidence: 0.9 },
        { name: "white socks", category: "clothing", quantity: 1, confidence: 0.7 },
      ]),
    );

    const result = await service.ingestPhoto(user.id, { imageBase64: "x", mediaType: "image/jpeg" });
    assert.equal(result.added.length, 1);
    assert.equal(result.duplicateCount, 1);
  });

  test("a photo with nothing detected adds nothing", async () => {
    const { user } = await signupUser();
    const service = new WardrobeService(fakeAnalyzer([]));

    const result = await service.ingestPhoto(user.id, { imageBase64: "x", mediaType: "image/jpeg" });
    assert.deepEqual(result, { added: [], duplicateCount: 0 });
  });

  test("only matches against the requesting user's own wardrobe", async () => {
    const { user: userA } = await signupUser();
    const { user: userB } = await signupUser();
    const wardrobeRepo = await import("../src/wardrobe/repository.js");
    wardrobeRepo.addWardrobeItem(userA.id, { name: "Red scarf", category: "accessories", quantity: 1 });

    const service = new WardrobeService(
      fakeAnalyzer([{ name: "Red scarf", category: "accessories", quantity: 1, confidence: 0.9 }]),
    );

    const result = await service.ingestPhoto(userB.id, { imageBase64: "x", mediaType: "image/jpeg" });
    assert.equal(result.added.length, 1, "userB has no red scarf yet, so it should be added, not skipped");
  });
});
