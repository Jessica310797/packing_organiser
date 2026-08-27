import { StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { RecommendedItem } from "../api/types";
import { colors, fonts, radius, spacing } from "../theme";

const STATUS_ICON: Record<RecommendedItem["status"], keyof typeof Feather.glyphMap> = {
  packed: "check-circle",
  partial: "minus-circle",
  missing: "circle",
};

const STATUS_COLOR: Record<RecommendedItem["status"], string> = {
  packed: colors.green,
  partial: colors.beigeDark,
  missing: colors.mutedLight,
};

export function RecommendationRow({ item }: { item: RecommendedItem }) {
  return (
    <View style={styles.row}>
      <Feather name={STATUS_ICON[item.status]} size={20} color={STATUS_COLOR[item.status]} />
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
    backgroundColor: colors.card,
    borderRadius: radius.input,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  name: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink },
  reasons: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  quantity: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
