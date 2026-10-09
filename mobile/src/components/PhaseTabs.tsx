import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

export type Phase = "packing" | "itinerary";

/**
 * Packing/Itinerary phase switch -- a grey pill track where the active
 * phase renders as a tight black pill and the inactive phase stretches to
 * fill the rest of the row, rather than two equal-width segments.
 */
export function PhaseTabs({ active, onChange }: { active: Phase; onChange: (phase: Phase) => void }) {
  return (
    <View style={styles.track}>
      <Tab label="Packing" active={active === "packing"} onPress={() => onChange("packing")} />
      <Tab label="Itinerary" active={active === "itinerary"} onPress={() => onChange("itinerary")} />
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}>
      <Text style={active ? styles.labelActive : styles.labelInactive} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 3,
    width: "100%",
  },
  // Explicit flexGrow/flexShrink/flexBasis rather than the ambiguous `flex: n`
  // shorthand -- react-native-web maps `flex: 0` to CSS `flex: 0 1 0%`
  // (collapses to zero width), unlike native Yoga's "size to content".
  tab: { alignItems: "center", justifyContent: "center" },
  tabActive: { flexGrow: 0, flexShrink: 0, flexBasis: "auto" },
  tabInactive: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  labelActive: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: "#fff",
    backgroundColor: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    overflow: "hidden",
    textAlign: "center",
  },
  labelInactive: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.mutedLight,
    paddingVertical: 6,
    paddingHorizontal: 13,
    width: "100%",
    textAlign: "center",
  },
});
