import * as openMeteo from "./openMeteoClient.js";

// Open-Meteo's free forecast endpoint reliably covers about 16 days ahead;
// staying a little inside that keeps us clear of the edge.
const FORECAST_HORIZON_DAYS = 15;

export interface TripWeather {
  available: boolean;
  tempC?: number;
  condition?: string;
  emoji?: string;
}

export interface WeatherClient {
  geocodeDestination: typeof openMeteo.geocodeDestination;
  getDailyForecast: typeof openMeteo.getDailyForecast;
}

const defaultClient: WeatherClient = {
  geocodeDestination: openMeteo.geocodeDestination,
  getDailyForecast: openMeteo.getDailyForecast,
};

function daysFromToday(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Best-effort forecast for a trip's start date. Returns { available: false }
 * -- never throws -- whenever the destination can't be geocoded, the date
 * falls outside Open-Meteo's forecast horizon (most trips booked more than
 * ~2 weeks out), or either API call fails.
 */
export async function getTripWeather(
  destination: string,
  startDateIso: string,
  client: WeatherClient = defaultClient,
): Promise<TripWeather> {
  const offset = daysFromToday(startDateIso);
  if (offset < 0 || offset > FORECAST_HORIZON_DAYS) {
    return { available: false };
  }

  try {
    const location = await client.geocodeDestination(destination);
    if (!location) return { available: false };

    const forecast = await client.getDailyForecast(location.latitude, location.longitude, startDateIso);
    if (!forecast) return { available: false };

    const { emoji, label } = openMeteo.describeWeatherCode(forecast.weatherCode);
    return {
      available: true,
      tempC: Math.round(forecast.tempMaxC),
      condition: label,
      emoji,
    };
  } catch {
    return { available: false };
  }
}
