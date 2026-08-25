import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InventoryItem } from "../api/types";
import { colors, textStyles } from "../theme";

export function InventoryRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: InventoryItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={textStyles.cardTitle}>
          {item.name} {item.source === "manual" ? "✏️" : ""}
        </Text>
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
    gap: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  qty: {
    backgroundColor: "#eee",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: "700",
  },
  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#f1f1ef",
    alignItems: "center",
    justifyContent: "center",
  },
});
