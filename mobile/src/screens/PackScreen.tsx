import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PackStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import { listTrips } from "../api/client";
import { formatDateRange, isTripCurrent } from "../lib/dates";
import { cardShadow, colors, radius, spacing, textStyles } from "../theme";

type Props = NativeStackScreenProps<PackStackParamList, "PackHome">;

export default function PackScreen({ navigation }: Props) {
  const [trips, setTrips] = useState<Trip[] | null>(null);

  const load = useCallback(() => {
    listTrips().then((all) => setTrips(all.filter((t) => isTripCurrent(t.endDate))));
  }, []);

  useFocusEffect(load);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.intro}>Pick a trip to keep packing.</Text>

      {trips === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.lg }} />}
      {trips !== null && trips.length === 0 && (
        <Text style={styles.empty}>No trips in progress right now -- plan one from the Trips tab.</Text>
      )}

      <View style={{ gap: spacing.sm }}>
        {(trips ?? []).map((trip) => (
          <Pressable
            key={trip.id}
            style={styles.card}
            onPress={() => navigation.navigate("TripDetail", { tripId: trip.id, destination: trip.destination })}
          >
            <Text style={textStyles.cardTitle}>{trip.destination}</Text>
            <Text style={styles.meta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
            {trip.purpose.length > 0 && <Text style={styles.purpose}>{trip.purpose}</Text>}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, color: colors.muted, marginBottom: spacing.md },
  empty: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
    ...cardShadow,
  },
  meta: { fontSize: 12.5, color: colors.muted },
  purpose: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
