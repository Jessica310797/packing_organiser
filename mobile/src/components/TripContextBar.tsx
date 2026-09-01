import { StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { Trip } from "../api/types";
import type { TripWeather } from "../api/client";
import { formatDateRange } from "../lib/dates";
import { weatherIconName } from "../lib/weatherIcon";
import { colors, fonts, spacing } from "../theme";

/** Surfaces the trip context (dates, duration, weather, purpose) that the packing checklist below is actually based on. */
export function TripContextBar({ trip, weather }: { trip: Trip; weather: TripWeather | null }) {
  return (
    <View style={styles.container}>
      <Text style={styles.line}>
        {trip.durationDays} day{trip.durationDays === 1 ? "" : "s"} · {formatDateRange(trip.startDate, trip.endDate)}
      </Text>
      <View style={styles.row}>
        {weather?.available && (
          <View style={styles.chip}>
            <Feather name={weatherIconName(weather.condition ?? "")} size={13} color={colors.green} />
            <Text style={styles.chipLabel}>
              {weather.tempC}°C {weather.condition}
            </Text>
          </View>
        )}
        {trip.purpose.length > 0 && (
          <View style={styles.chip}>
            <Feather name="briefcase" size={13} color={colors.green} />
            <Text style={styles.chipLabel}>{trip.purpose}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  line: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 5 },
  chipLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
