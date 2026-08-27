import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TripsStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import { apiUrl, getInventory, getPhotos, listTrips } from "../api/client";
import { formatDateRange, isTripCurrent, isTripPast } from "../lib/dates";
import { cardShadow, colors, fonts, radius, spacing, textStyles } from "../theme";
import { TripCoverImage } from "../components/TripCoverImage";

type Props = NativeStackScreenProps<TripsStackParamList, "Home">;

interface TripWithMeta {
  trip: Trip;
  coverUrl: string | null;
  itemCount: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen({ navigation }: Props) {
  const [current, setCurrent] = useState<TripWithMeta[] | null>(null);
  const [past, setPast] = useState<TripWithMeta[]>([]);

  const load = useCallback(() => {
    listTrips().then(async (trips) => {
      const withMeta = await Promise.all(
        trips.map(async (trip): Promise<TripWithMeta> => {
          const [photos, inventory] = await Promise.all([
            getPhotos(trip.id).catch(() => []),
            getInventory(trip.id).catch(() => []),
          ]);
          return { trip, coverUrl: photos[0] ? apiUrl(photos[0].url) : null, itemCount: inventory.length };
        }),
      );
      setCurrent(withMeta.filter((t) => isTripCurrent(t.trip.endDate)));
      setPast(withMeta.filter((t) => isTripPast(t.trip.endDate)).reverse());
    });
  }, []);

  useFocusEffect(load);

  function openTrip(trip: Trip) {
    navigation.navigate("TripDetail", { tripId: trip.id, destination: trip.destination });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={textStyles.wordmark}>PAKKA</Text>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 18 }}>🙂</Text>
        </View>
      </View>

      <Text style={textStyles.greeting}>{greeting()}</Text>
      <Text style={styles.subtitle}>Where are we off to next?</Text>

      <Pressable style={styles.planCard} onPress={() => navigation.navigate("NewTrip")}>
        <View style={styles.planIcon}>
          <Text style={{ fontSize: 22 }}>🧳</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={textStyles.cardTitle}>Plan a trip</Text>
          <Text style={styles.planBody}>Get personalised packing recommendations for any destination.</Text>
          <View style={styles.planButton}>
            <Text style={styles.planButtonLabel}>Plan trip →</Text>
          </View>
        </View>
      </Pressable>

      <Text style={[textStyles.title, styles.sectionTitle]}>Current trips</Text>
      {current === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />}
      {current !== null && current.length === 0 && (
        <Text style={styles.empty}>No upcoming trips yet -- plan one above.</Text>
      )}
      <View style={{ gap: spacing.md }}>
        {(current ?? []).map(({ trip, coverUrl, itemCount }) => (
          <Pressable key={trip.id} style={styles.currentCard} onPress={() => openTrip(trip)}>
            <TripCoverImage uri={coverUrl} style={{ width: 96, height: 96 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={textStyles.cardTitle}>{trip.destination}</Text>
              <Text style={styles.meta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
              {trip.purpose.length > 0 && <Text style={styles.purpose}>{trip.purpose}</Text>}
              <Text style={styles.itemCount}>
                {itemCount} item{itemCount === 1 ? "" : "s"} packed
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {past.length > 0 && (
        <>
          <Text style={[textStyles.title, styles.sectionTitle]}>Past trips</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md }}>
              {past.map(({ trip, coverUrl }) => (
                <Pressable key={trip.id} style={styles.pastCard} onPress={() => openTrip(trip)}>
                  <TripCoverImage uri={coverUrl} style={{ width: 140, height: 100 }} />
                  <Text style={styles.pastLabel} numberOfLines={1}>
                    {trip.destination}
                  </Text>
                  <Text style={styles.pastMeta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.tan,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.md },
  planCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.tan,
    alignItems: "center",
    justifyContent: "center",
  },
  planBody: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.sm },
  planButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  planButtonLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionTitle: { marginTop: spacing.sm, marginBottom: spacing.sm },
  empty: { color: colors.muted, fontSize: 14, marginBottom: spacing.md },
  currentCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    ...cardShadow,
  },
  meta: { fontSize: 12.5, color: colors.muted },
  purpose: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  itemCount: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  pastCard: { width: 140, marginBottom: spacing.md },
  pastLabel: { fontFamily: fonts.serifSemiBold, fontSize: 14, color: colors.ink, marginTop: 6 },
  pastMeta: { fontSize: 11.5, color: colors.muted },
});
