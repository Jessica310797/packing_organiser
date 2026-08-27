import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { InventoryItem } from "../api/types";
import { apiUrl } from "../api/client";
import { categoryIconName } from "../lib/categoryIcon";
import { colors, fonts, radius, textStyles } from "../theme";

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
      {item.photoUrl ? (
        <Image source={{ uri: apiUrl(item.photoUrl) }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <MaterialCommunityIcons name={categoryIconName(item.category)} size={18} color={colors.green} />
        </View>
      )}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={textStyles.cardTitle}>{item.name}</Text>
        {item.source === "manual" && <Feather name="edit-2" size={12} color={colors.muted} />}
      </View>
      <Text style={styles.qty}>×{item.quantity}</Text>
      <Pressable style={styles.smallBtn} onPress={onDecrement}>
        <Feather name="minus" size={14} color={colors.ink} />
      </Pressable>
      <Pressable style={styles.smallBtn} onPress={onIncrement}>
        <Feather name="plus" size={14} color={colors.ink} />
      </Pressable>
      <Pressable style={styles.smallBtn} onPress={onRemove}>
        <Feather name="x" size={14} color={colors.danger} />
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
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.paleGreen },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  qty: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontFamily: fonts.semiBold,
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
