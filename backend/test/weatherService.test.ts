import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getTripWeather, type WeatherClient } from "../src/weather/weatherService.js";

function isoDaysFromToday(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe("getTripWeather", () => {
  test("is unavailable for a date beyond the forecast horizon, without calling the client", async () => {
    let called = false;
    const client: WeatherClient = {
      geocodeDestination: async () => {
        called = true;
        return { latitude: 1, longitude: 1 };
      },
      getDailyForecast: async () => ({ tempMaxC: 20, tempMinC: 10, weatherCode: 0 }),
    };

    const result = await getTripWeather("Lisbon", isoDaysFromToday(30), client);

    assert.equal(result.available, false);
    assert.equal(called, false, "should short-circuit before geocoding a far-future date");
  });

  test("is unavailable for a date in the past", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => ({ latitude: 1, longitude: 1 }),
      getDailyForecast: async () => ({ tempMaxC: 20, tempMinC: 10, weatherCode: 0 }),
    };

    const result = await getTripWeather("Lisbon", isoDaysFromToday(-1), client);
    assert.equal(result.available, false);
  });

  test("is unavailable when the destination can't be geocoded", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => null,
      getDailyForecast: async () => ({ tempMaxC: 20, tempMinC: 10, weatherCode: 0 }),
    };

    const result = await getTripWeather("Nowhereville", isoDaysFromToday(3), client);
    assert.equal(result.available, false);
  });

  test("is unavailable when the forecast call fails", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => ({ latitude: 1, longitude: 1 }),
      getDailyForecast: async () => null,
    };

    const result = await getTripWeather("Lisbon", isoDaysFromToday(3), client);
    assert.equal(result.available, false);
  });

  test("never throws even if the client rejects", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => {
        throw new Error("network down");
      },
      getDailyForecast: async () => null,
    };

    const result = await getTripWeather("Lisbon", isoDaysFromToday(3), client);
    assert.equal(result.available, false);
  });

  test("maps a successful forecast to a rounded temp, condition, and emoji", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => ({ latitude: 38.7, longitude: -9.1 }),
      getDailyForecast: async () => ({ tempMaxC: 23.6, tempMinC: 14.2, weatherCode: 0 }),
    };

    const result = await getTripWeather("Lisbon, Portugal", isoDaysFromToday(3), client);

    assert.equal(result.available, true);
    assert.equal(result.tempC, 24);
    assert.equal(result.condition, "Sunny");
    assert.equal(result.emoji, "☀️");
  });

  test("is available exactly at the forecast horizon boundary", async () => {
    const client: WeatherClient = {
      geocodeDestination: async () => ({ latitude: 1, longitude: 1 }),
      getDailyForecast: async () => ({ tempMaxC: 10, tempMinC: 5, weatherCode: 3 }),
    };

    const result = await getTripWeather("Somewhere", isoDaysFromToday(15), client);
    assert.equal(result.available, true);
  });
});
