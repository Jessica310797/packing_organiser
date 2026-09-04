import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";

export function PackingProgressBar({ packed, total }: { packed: number; total: number }) {
  if (total === 0) return null;

  const percent = Math.min(100, Math.round((packed / total) * 100));
  const remaining = Math.max(0, total - packed);
  const done = remaining === 0;

  return (
    <View style={styles.container}>
      {done ? (
        <Text style={styles.celebration}>🎉 You're packed! Pakka thinks you've got everything you need.</Text>
      ) : (
        <>
          <View style={styles.labelRow}>
            <Text style={styles.label}>
              {packed} / {total} items packed
            </Text>
            <Text style={styles.remaining}>{remaining} remaining</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.ink },
  remaining: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.progressBg, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.green },
  celebration: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.green,
    backgroundColor: colors.paleGreen,
    borderRadius: radius.input,
    padding: spacing.sm,
    textAlign: "center",
  },
});
