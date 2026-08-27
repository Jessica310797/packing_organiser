import { Pressable, StyleSheet, Text, View } from "react-native";
import type { WardrobeItem } from "../api/types";
import { cardShadow, colors, radius, textStyles } from "../theme";

export function WardrobeRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: WardrobeItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={textStyles.cardTitle}>{item.name}</Text>
        <Text style={textStyles.muted}>{item.category ?? "uncategorized"}</Text>
      </View>
      <Text style={styles.qty}>×{item.quantity}</Text>
      <Pressable style={styles.smallBtn} onPress={onDecrement}>
        <Text>−</Text>
      </Pressable>
      <Pressable style={styles.smallBtn} onPress={onIncrement}>
        <Text>+</Text>
      </Pressable>
      <Pressable style={styles.smallBtn} onPress={onRemove}>
        <Text style={{ color: colors.danger }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    ...cardShadow,
  },
  qty: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
