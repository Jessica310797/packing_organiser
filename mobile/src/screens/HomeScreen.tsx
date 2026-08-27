import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Feather from "@expo/vector-icons/Feather";
import type { TripsStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import {
  apiUrl,
  getDestinationPhoto,
  getInventory,
  getPhotos,
  getWeather,
  listTrips,
  type TripWeather,
} from "../api/client";
import { formatDateRange, isTripCurrent, isTripPast } from "../lib/dates";
import { useAuth } from "../lib/authContext";
import { colors, spacing, textStyles } from "../theme";
import { PlanTripCard } from "../components/PlanTripCard";
import { CurrentTripCard } from "../components/CurrentTripCard";
import { PastTripCard } from "../components/PastTripCard";

type Props = NativeStackScreenProps<TripsStackParamList, "Home">;

interface TripWithMeta {
  trip: Trip;
  imageUrl: string | null;
  itemCount: number;
  weather: TripWeather;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function loadTripMeta(trip: Trip): Promise<TripWithMeta> {
  const [photos, inventory, weather, destinationPhoto] = await Promise.all([
    getPhotos(trip.id).catch(() => []),
    getInventory(trip.id).catch(() => []),
    getWeather(trip.id).catch((): TripWeather => ({ available: false })),
    getDestinationPhoto(trip.id).catch(() => ({ available: false as const })),
  ]);
  const imageUrl = destinationPhoto.available && destinationPhoto.url
    ? destinationPhoto.url
    : photos[0]
      ? apiUrl(photos[0].url)
      : null;
  return { trip, imageUrl, itemCount: inventory.length, weather };
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [current, setCurrent] = useState<TripWithMeta[] | null>(null);
  const [past, setPast] = useState<TripWithMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listTrips()
      .then(async (trips) => {
        const withMeta = await Promise.all(trips.map(loadTripMeta));
        setCurrent(withMeta.filter((t) => isTripCurrent(t.trip.endDate)));
        setPast(withMeta.filter((t) => isTripPast(t.trip.endDate)).reverse());
      })
      .catch((err) => setError((err as Error).message || "Couldn't reach the server."));
  }, []);

  useFocusEffect(load);

  function openTrip(trip: Trip) {
    navigation.navigate("TripDetail", { tripId: trip.id, destination: trip.destination });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={textStyles.wordmark}>PAKKA</Text>
        <Pressable style={styles.avatar} onPress={() => navigation.getParent()?.navigate("ProfileTab" as never)}>
          <Feather name="user" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <Text style={styles.greeting}>
        {greeting()}
        {user?.name ? `, ${user.name}` : ""}
      </Text>
      <Text style={styles.subtitle}>Where are we off to next?</Text>

      <View style={styles.section}>
        <PlanTripCard onPress={() => navigation.navigate("NewTrip")} />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={textStyles.sectionTitle}>Current trips</Text>
        <Text style={styles.seeAll}>See all ›</Text>
      </View>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Couldn't load trips: {error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retryLink}>Try again</Text>
          </Pressable>
        </View>
      )}
      {!error && current === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />}
      {!error && current !== null && current.length === 0 && (
        <Text style={styles.empty}>No upcoming trips yet -- plan one above.</Text>
      )}
      <View style={{ gap: spacing.md }}>
        {(current ?? []).map(({ trip, imageUrl, itemCount, weather }) => (
          <CurrentTripCard
            key={trip.id}
            destination={trip.destination}
            dateRange={formatDateRange(trip.startDate, trip.endDate)}
            imageUrl={imageUrl}
            weather={weather}
            itemCount={itemCount}
            packingTarget={trip.packingTarget}
            onPress={() => openTrip(trip)}
          />
        ))}
      </View>

      {past.length > 0 && (
        <>
          <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
            <Text style={textStyles.sectionTitle}>Past trips</Text>
            <Text style={styles.seeAll}>See all ›</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.md }}>
            <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md }}>
              {past.map(({ trip, imageUrl }) => (
                <PastTripCard
                  key={trip.id}
                  destination={trip.destination}
                  dateRange={formatDateRange(trip.startDate, trip.endDate)}
                  imageUrl={imageUrl}
                  onPress={() => openTrip(trip)}
                />
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.beige,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: { ...textStyles.greeting, marginTop: spacing.lg },
  subtitle: { ...textStyles.body, marginTop: 8, marginBottom: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  seeAll: { ...textStyles.body, fontSize: 15 },
  empty: { ...textStyles.muted, marginBottom: spacing.md },
  errorBox: {
    backgroundColor: colors.beigeBadge,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 6,
  },
  errorText: { ...textStyles.body, color: colors.beigeDark },
  retryLink: { ...textStyles.body, color: colors.ink, fontWeight: "600" as const },
});
