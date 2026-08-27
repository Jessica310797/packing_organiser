// Open-Meteo (https://open-meteo.com) -- free, no API key required, no
// signup. Geocoding turns a free-text destination into coordinates; the
// forecast endpoint only covers roughly the next 16 days, so most trips
// booked further ahead simply won't have a forecast yet (see weatherService).

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export async function geocodeDestination(query: string): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const body = (await res.json()) as {
    results?: { latitude: number; longitude: number }[];
  };
  const first = body.results?.[0];
  if (!first) return null;
  return { latitude: first.latitude, longitude: first.longitude };
}

export interface DailyForecast {
  tempMaxC: number;
  tempMinC: number;
  weatherCode: number;
}

/** Fetches the forecast for a single date (YYYY-MM-DD). Returns null if that date isn't covered. */
export async function getDailyForecast(
  latitude: number,
  longitude: number,
  dateIso: string,
): Promise<DailyForecast | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto` +
    `&start_date=${dateIso}&end_date=${dateIso}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const body = (await res.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      weathercode?: number[];
    };
  };
  const tempMaxC = body.daily?.temperature_2m_max?.[0];
  const tempMinC = body.daily?.temperature_2m_min?.[0];
  const weatherCode = body.daily?.weathercode?.[0];
  if (tempMaxC === undefined || tempMinC === undefined || weatherCode === undefined) return null;

  return { tempMaxC, tempMinC, weatherCode };
}

/** Maps a WMO weather code (as used by Open-Meteo) to a short label + emoji. */
export function describeWeatherCode(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Sunny" };
  if (code === 1) return { emoji: "🌤️", label: "Mostly sunny" };
  if (code === 2) return { emoji: "⛅", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Foggy" };
  if ([51, 53, 55, 56, 57].includes(code)) return { emoji: "🌦️", label: "Drizzle" };
  if ([61, 63, 65, 66, 67].includes(code)) return { emoji: "🌧️", label: "Rain" };
  if ([71, 73, 75, 77].includes(code)) return { emoji: "❄️", label: "Snow" };
  if ([80, 81, 82].includes(code)) return { emoji: "🌦️", label: "Showers" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "Snow showers" };
  if ([95, 96, 99].includes(code)) return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌡️", label: "—" };
}
