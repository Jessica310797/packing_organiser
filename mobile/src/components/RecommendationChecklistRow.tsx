import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { RecommendedItem } from "../api/types";
import { colors, fonts, radius, spacing } from "../theme";

const TINT: Record<"missing" | "partial", string> = {
  missing: "rgba(179, 69, 46, 0.06)",
  partial: "rgba(128, 107, 76, 0.08)",
};

const OUTLINE: Record<"missing" | "partial", string> = {
  missing: colors.danger,
  partial: colors.beigeDark,
};

/**
 * A not-yet-fully-packed recommendation rendered inline among the real
 * packed items for its category. Tapping the checkbox marks it packed --
 * adds an inventory item for whatever's still missing, which is enough to
 * flip this recommendation's status to "packed" on the next refresh (at
 * which point it stops appearing here and shows as a normal packed row
 * instead, same as anything else in the category).
 */
export function RecommendationChecklistRow({
  item,
  onMarkPacked,
}: {
  item: RecommendedItem;
  onMarkPacked: () => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  // Only "missing" and "partial" ever reach this component -- "packed" ones
  // belong in the plain packed list instead.
  const status = item.status as "missing" | "partial";

  async function handlePress() {
    if (marking) return;
    setMarking(true);
    try {
      await onMarkPacked();
    } finally {
      setMarking(false);
    }
  }

  return (
    <View style={[styles.row, { backgroundColor: TINT[status], borderColor: OUTLINE[status] }]}>
      <Pressable
        style={styles.checkbox}
        onPress={handlePress}
        disabled={marking}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: false, disabled: marking }}
        accessibilityLabel={`Mark ${item.name} as packed`}
      >
        {marking ? (
          <ActivityIndicator size="small" color={colors.green} />
        ) : (
          <View style={[styles.checkboxCircle, { borderColor: OUTLINE[status] }]} />
        )}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.reasons}>{item.reasons.join(" · ")}</Text>
      </View>
      <Text style={styles.quantity}>
        {item.packedQuantity} / {item.recommendedQuantity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  checkbox: { width: 26, alignItems: "center", justifyContent: "center" },
  checkboxCircle: { width: 20, height: 20, borderRadius: 999, borderWidth: 2 },
  name: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink },
  reasons: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  quantity: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
