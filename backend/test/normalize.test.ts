import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeName, normalizeCategory } from "../src/normalize.js";

describe("normalizeName", () => {
  test("lowercases and strips punctuation", () => {
    assert.equal(normalizeName("Blue T-Shirt!"), "blue t-shirt");
  });

  test("drops articles and quantity words", () => {
    assert.equal(normalizeName("a pair of socks"), "sock");
  });

  test("singularizes simple plurals", () => {
    assert.equal(normalizeName("Shoes"), "shoe");
    assert.equal(normalizeName("Toothbrushes"), "toothbrush");
    assert.equal(normalizeName("Batteries"), "battery");
  });

  test("does not mangle words that are inherently plural", () => {
    assert.equal(normalizeName("Sunglasses"), "sunglasses");
    assert.equal(normalizeName("Shorts"), "shorts");
  });

  test("two differently-phrased detections of the same item normalize identically", () => {
    assert.equal(normalizeName("a pair of socks"), normalizeName("Socks"));
  });
});

describe("normalizeCategory", () => {
  test("lowercases and trims", () => {
    assert.equal(normalizeCategory("  Clothing "), "clothing");
  });

  test("null/empty stays null", () => {
    assert.equal(normalizeCategory(null), null);
    assert.equal(normalizeCategory(""), null);
  });
});
