import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import { listTrips } from "../api/client";
import { colors, spacing, textStyles } from "../theme";

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
      {!trips && !error && <ActivityIndicator style={{ marginTop: spacing.lg }} />}
      {trips && trips.length === 0 && (
        <Text style={styles.empty}>No trips yet — create one to get started.</Text>
      )}
      <FlatList
        data={trips ?? []}
        keyExtractor={(trip) => trip.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("TripDetail", { tripId: item.id, destination: item.destination })}
          >
            <Text style={textStyles.cardTitle}>{item.destination}</Text>
            <Text style={textStyles.muted}>
              {item.startDate} → {item.endDate} · {item.durationDays} day(s)
            </Text>
            {item.activities.length > 0 && (
              <Text style={textStyles.muted}>{item.activities.join(", ")}</Text>
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
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  empty: { textAlign: "center", marginTop: spacing.lg, color: colors.muted },
  error: { color: colors.danger, padding: spacing.md },
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabLabel: { color: "#fff", fontWeight: "700" },
});
