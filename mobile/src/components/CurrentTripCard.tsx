import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { TripWeather } from "../api/client";
import { weatherIconName } from "../lib/weatherIcon";
import { colors, fonts, radius, shadowCard, spacing, textStyles } from "../theme";

export function CurrentTripCard({
  destination,
  dateRange,
  imageUrl,
  weather,
  itemCount,
  packingTarget,
  onPress,
}: {
  destination: string;
  dateRange: string;
  imageUrl: string | null;
  weather: TripWeather;
  itemCount: number;
  packingTarget: number | null;
  onPress: () => void;
}) {
  const percent =
    packingTarget && packingTarget > 0 ? Math.min(100, Math.round((itemCount / packingTarget) * 100)) : null;
  const highProgress = percent !== null && percent >= 50;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Feather name="image" size={22} color={colors.muted} style={{ opacity: 0.5 }} />
        </View>
      )}

      <View style={styles.info}>
        <View style={{ gap: 4 }}>
          <Text style={textStyles.cardTitleSerif} numberOfLines={2}>
            {destination}
          </Text>
          <Text style={styles.meta}>{dateRange}</Text>
          {weather.available && (
            <View style={styles.weatherRow}>
              <Feather name={weatherIconName(weather.condition ?? "")} size={14} color={colors.green} />
              <Text style={styles.meta}>
                {weather.tempC}°C {weather.condition}
              </Text>
            </View>
          )}
        </View>

        <View style={{ gap: 6 }}>
          {percent !== null ? (
            <>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Packing progress</Text>
                <Text style={styles.progressLabel}>
                  {itemCount} / {packingTarget} items
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
            </>
          ) : (
            <Text style={styles.progressLabel}>
              {itemCount} item{itemCount === 1 ? "" : "s"} packed
            </Text>
          )}
        </View>
      </View>

      {percent !== null && (
        <View style={[styles.badge, highProgress ? styles.badgeHigh : styles.badgeLow]}>
          <Text style={[styles.badgeLabel, highProgress ? styles.badgeLabelHigh : styles.badgeLabelLow]}>
            {percent}%
          </Text>
        </View>
      )}

      <Feather name="chevron-right" size={22} color={colors.ink} style={styles.chevron} />
    </Pressable>
  );
}

const CARD_HEIGHT = 250;
const IMAGE_WIDTH = 140;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 10,
    height: CARD_HEIGHT,
    ...shadowCard,
  },
  image: { width: IMAGE_WIDTH, height: CARD_HEIGHT - 20, borderRadius: 18, backgroundColor: colors.beige },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  info: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingRight: 22,
    paddingVertical: spacing.xs,
    justifyContent: "space-between",
  },
  meta: { ...textStyles.muted },
  weatherRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.progressBg, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.green },
  badge: {
    position: "absolute",
    top: 18,
    right: 18,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeHigh: { backgroundColor: colors.paleGreen },
  badgeLow: { backgroundColor: colors.beigeBadge },
  badgeLabel: { fontFamily: fonts.semiBold, fontSize: 13 },
  badgeLabelHigh: { color: colors.green },
  badgeLabelLow: { color: colors.beigeDark },
  chevron: { position: "absolute", right: 4, top: "50%", marginTop: -11 },
});
