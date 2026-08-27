import type Feather from "@expo/vector-icons/Feather";

/** Maps a weather condition label (from the backend's WMO-code description) to a thin-line Feather icon. */
export function weatherIconName(condition: string): keyof typeof Feather.glyphMap {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "cloud-lightning";
  if (c.includes("snow")) return "cloud-snow";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return "cloud-rain";
  if (c.includes("fog")) return "cloud";
  if (c.includes("cloud")) return "cloud";
  return "sun";
}
