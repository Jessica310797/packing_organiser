import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import { listTrips } from "../api/client";
import { cardShadow, colors, radius, spacing, textStyles } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Trips">;

export default function TripsScreen({ navigation }: Props) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listTrips()
      .then(setTrips)
      .catch((err) => setError(err.message));
  }, []);

  // Refetch every time this screen regains focus (e.g. after creating a trip).
  useFocusEffect(load);

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      {!trips && !error && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.accent} />}
      {trips && trips.length === 0 && (
        <Text style={styles.empty}>No trips yet — create one to get started.</Text>
      )}
      <FlatList
        data={trips ?? []}
        keyExtractor={(trip) => trip.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("TripDetail", { tripId: item.id, destination: item.destination })}
          >
            <Text style={textStyles.title}>{item.destination}</Text>
            {item.purpose.length > 0 && <Text style={styles.purpose}>{item.purpose}</Text>}
            <Text style={styles.meta}>
              {item.startDate} → {item.endDate} · {item.durationDays} day(s)
            </Text>
            {item.activities.length > 0 && (
              <Text style={styles.meta}>{item.activities.join(" · ")}</Text>
            )}
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate("NewTrip")}>
        <Text style={styles.fabLabel}>+ New trip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    ...cardShadow,
  },
  purpose: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  meta: { fontSize: 13, color: colors.muted },
  empty: { textAlign: "center", marginTop: spacing.lg, color: colors.muted },
  error: { color: colors.danger, padding: spacing.md },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
