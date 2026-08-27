import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getDestinationPhoto,
  type DestinationPhotoClient,
} from "../src/photos/destinationPhotoService.js";

describe("getDestinationPhoto", () => {
  test("returns unavailable when no thumbnail is found", async () => {
    const client: DestinationPhotoClient = {
      searchDestinationImage: async () => null,
    };

    const result = await getDestinationPhoto("Nowhereville", client);
    assert.equal(result.available, false);
    assert.equal(result.url, undefined);
  });

  test("never throws even if the client rejects", async () => {
    const client: DestinationPhotoClient = {
      searchDestinationImage: async () => {
        throw new Error("network down");
      },
    };

    const result = await getDestinationPhoto("Lisbon", client);
    assert.equal(result.available, false);
  });

  test("maps a successful lookup to an available photo URL", async () => {
    const client: DestinationPhotoClient = {
      searchDestinationImage: async () => "https://upload.wikimedia.org/example.jpg",
    };

    const result = await getDestinationPhoto("Amalfi Coast", client);
    assert.equal(result.available, true);
    assert.equal(result.url, "https://upload.wikimedia.org/example.jpg");
  });
});
