import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Feather from "@expo/vector-icons/Feather";
import type { TripsStackParamList } from "../navigation/types";
import type { Trip } from "../api/types";
import { apiUrl, getInventory, getPhotos, getWeather, listTrips, type TripWeather } from "../api/client";
import { formatDateRange, isTripCurrent, isTripPast, todayIso } from "../lib/dates";
import { colors, fonts, radius, spacing, textStyles } from "../theme";
import { TripCoverImage } from "../components/TripCoverImage";

type Props = NativeStackScreenProps<TripsStackParamList, "Home">;

interface TripWithMeta {
  trip: Trip;
  coverUrl: string | null;
  itemCount: number;
  weather: TripWeather;
}

function tripStatus(trip: Trip): { label: string; active: boolean } {
  const today = todayIso();
  if (trip.startDate <= today && today <= trip.endDate) return { label: "In progress", active: true };
  if (isTripPast(trip.endDate)) return { label: "Completed", active: false };
  return { label: "Planning", active: true };
}

export default function HomeScreen({ navigation }: Props) {
  const [current, setCurrent] = useState<TripWithMeta[] | null>(null);
  const [past, setPast] = useState<TripWithMeta[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const tripsSectionY = useRef(0);

  const load = useCallback(() => {
    listTrips().then(async (trips) => {
      const withMeta = await Promise.all(
        trips.map(async (trip): Promise<TripWithMeta> => {
          const [photos, inventory, weather] = await Promise.all([
            getPhotos(trip.id).catch(() => []),
            getInventory(trip.id).catch(() => []),
            getWeather(trip.id).catch((): TripWeather => ({ available: false })),
          ]);
          return {
            trip,
            coverUrl: photos[0] ? apiUrl(photos[0].url) : null,
            itemCount: inventory.length,
            weather,
          };
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

  function scrollToTrips() {
    scrollRef.current?.scrollTo({ y: tripsSectionY.current, animated: true });
  }

  return (
    <ScrollView ref={scrollRef} style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={textStyles.wordmark}>pakka</Text>
        <Pressable
          style={styles.avatar}
          onPress={() => navigation.getParent()?.navigate("ProfileTab" as never)}
        >
          <Feather name="user" size={18} color={colors.forest} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={textStyles.eyebrow}>Your personal travel assistant</Text>
        <Text style={[textStyles.headline, styles.headlineSpacing]}>Plan less.{"\n"}Travel better.</Text>
        <Text style={styles.heroBody}>
          Snap photos as you pack and pakka keeps track of everything for you -- no more guessing
          what's already in the case.
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryCta} onPress={() => navigation.navigate("NewTrip")}>
            <Text style={styles.primaryCtaLabel}>Plan a trip →</Text>
          </Pressable>
          <Pressable style={styles.secondaryCta} onPress={scrollToTrips}>
            <Text style={styles.secondaryCtaLabel}>View my trips</Text>
          </Pressable>
        </View>
      </View>

      <View onLayout={(e) => (tripsSectionY.current = e.nativeEvent.layout.y)}>
        <Text style={[textStyles.title, styles.sectionTitle]}>Your trips</Text>
        {current === null && <ActivityIndicator color={colors.forest} style={{ marginTop: spacing.md }} />}
        {current !== null && current.length === 0 && (
          <Text style={styles.empty}>No upcoming trips yet -- plan one above.</Text>
        )}
        <View style={{ gap: spacing.md }}>
          {(current ?? []).map(({ trip, coverUrl, itemCount, weather }) => {
            const status = tripStatus(trip);
            return (
              <Pressable key={trip.id} style={styles.tripCard} onPress={() => openTrip(trip)}>
                <View>
                  <TripCoverImage uri={coverUrl} style={{ width: "100%", height: 140, borderRadius: 0 }} />
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeLabel}>
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                </View>
                <View style={styles.tripCardBody}>
                  <View style={styles.tripCardTop}>
                    <Text style={textStyles.cardTitle}>{trip.destination}</Text>
                    <View style={[styles.statusPill, status.active ? styles.statusPillActive : styles.statusPillDone]}>
                      <Text style={[styles.statusLabel, status.active ? styles.statusLabelActive : styles.statusLabelDone]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  {trip.purpose.length > 0 && <Text style={styles.purpose}>{trip.purpose}</Text>}
                  <Text style={styles.meta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
                  {weather.available && (
                    <Text style={styles.weather}>
                      {weather.emoji} {weather.tempC}°C {weather.condition}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
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

      <View style={styles.ctaSection}>
        <Text style={styles.ctaHeading}>Where are you going next?</Text>
        <Text style={styles.ctaBody}>Start a new trip and let pakka track your packing from the first photo.</Text>
        <Pressable style={styles.primaryCta} onPress={() => navigation.navigate("NewTrip")}>
          <Text style={styles.primaryCtaLabel}>Plan a trip →</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { marginTop: spacing.xl, marginBottom: spacing.xl },
  headlineSpacing: { marginTop: spacing.sm },
  heroBody: { ...textStyles.body, marginTop: spacing.sm },
  heroActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg, flexWrap: "wrap" },
  primaryCta: {
    backgroundColor: colors.forest,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  primaryCtaLabel: { color: "#fff", fontFamily: fonts.medium, fontSize: 15 },
  secondaryCta: { paddingVertical: 10, paddingHorizontal: 4 },
  secondaryCtaLabel: { color: colors.forest, fontFamily: fonts.medium, fontSize: 15 },
  sectionTitle: { marginBottom: spacing.md },
  empty: { ...textStyles.muted, marginBottom: spacing.md },
  tripCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  tripCardBody: { padding: spacing.md, gap: 3 },
  tripCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  itemBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(32,33,31,0.72)",
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  itemBadgeLabel: { color: "#fff", fontFamily: fonts.medium, fontSize: 11.5 },
  statusPill: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  statusPillActive: { backgroundColor: colors.sage },
  statusPillDone: { backgroundColor: colors.border },
  statusLabel: { fontFamily: fonts.medium, fontSize: 11 },
  statusLabelActive: { color: colors.forest },
  statusLabelDone: { color: colors.muted },
  purpose: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  meta: { ...textStyles.muted },
  weather: { ...textStyles.muted, color: colors.ink, marginTop: 2 },
  pastCard: { width: 140, marginBottom: spacing.md },
  pastLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink, marginTop: 6 },
  pastMeta: { ...textStyles.muted },
  ctaSection: {
    backgroundColor: colors.sage,
    borderRadius: radius.ctaSection,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  ctaHeading: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.ink },
  ctaBody: { ...textStyles.body, marginBottom: spacing.sm },
});
