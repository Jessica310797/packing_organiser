import { Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors, fonts, radius, shadowCard, spacing, textStyles } from "../theme";

/** The home screen's main CTA -- start a new trip. */
export function PlanTripCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.decoration} pointerEvents="none">
        <View style={styles.dashedLine} />
        <Feather name="send" size={14} color={colors.border} style={styles.plane} />
      </View>

      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Feather name="briefcase" size={28} color={colors.ink} />
        </View>
        <View style={styles.textCol}>
          <Text style={textStyles.cardTitleSerif}>Plan a trip</Text>
          <Text style={styles.body}>Get personalised packing recommendations for any destination.</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Text style={styles.buttonLabel}>Plan trip →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.cardLarge,
    padding: spacing.md,
    overflow: "hidden",
    ...shadowCard,
  },
  decoration: { position: "absolute", top: 14, right: 20, width: 90, height: 40 },
  dashedLine: {
    position: "absolute",
    width: 70,
    height: 1,
    top: 20,
    left: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    transform: [{ rotate: "-18deg" }],
  },
  plane: { position: "absolute", top: 0, right: 0, transform: [{ rotate: "45deg" }], opacity: 0.6 },
  row: { flexDirection: "row", gap: spacing.md },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, justifyContent: "center", gap: 3 },
  body: { ...textStyles.body, lineHeight: 21 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.md },
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  buttonLabel: { color: "#fff", fontFamily: fonts.medium, fontSize: 15 },
});
