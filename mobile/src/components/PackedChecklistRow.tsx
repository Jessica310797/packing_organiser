import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { InventoryItem } from "../api/types";
import { apiUrl } from "../api/client";
import { categoryIconName } from "../lib/categoryIcon";
import { colors, fonts, radius, spacing, textStyles } from "../theme";

export interface PackedItemPatch {
  name: string;
  category: string | null;
  quantity: number;
}

/**
 * A real (persisted) item's row -- used for both the "Packed" and "To Pack"
 * sections, distinguished by `item.packed`. The checkbox toggles between
 * the two (never deletes); the trash icon in the expanded/edit view is the
 * only way to actually remove the item. Tapping the row opens edit mode,
 * which also shows the item's real photo when it has one (e.g. detected
 * from a packing photo) rather than just a generic category icon.
 */
export function PackedChecklistRow({
  item,
  onTogglePacked,
  onDelete,
  onSave,
}: {
  item: InventoryItem;
  onTogglePacked: (packed: boolean) => Promise<void> | void;
  onDelete: () => void;
  onSave: (patch: PackedItemPatch) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [quantity, setQuantity] = useState(item.quantity);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setName(item.name);
    setCategory(item.category ?? "");
    setQuantity(item.quantity);
    setEditing(true);
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), category: category.trim() || null, quantity: Math.max(1, quantity) });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <View style={styles.editCard}>
        <View style={styles.editHeaderRow}>
          {item.photoUrl ? (
            <Image source={{ uri: apiUrl(item.photoUrl) }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <MaterialCommunityIcons name={categoryIconName(item.category)} size={22} color={colors.green} />
            </View>
          )}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <TextInput style={styles.editInput} value={name} onChangeText={setName} placeholder="Item name" />
            <TextInput
              style={styles.editInput}
              value={category}
              onChangeText={setCategory}
              placeholder="Category (optional)"
            />
          </View>
        </View>
        <View style={styles.editRow}>
          <View style={styles.stepper}>
            <Pressable style={styles.stepperBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Feather name="minus" size={14} color={colors.ink} />
            </Pressable>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <Pressable style={styles.stepperBtn} onPress={() => setQuantity((q) => q + 1)}>
              <Feather name="plus" size={14} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.textBtn} onPress={() => setEditing(false)}>
            <Text style={styles.textBtnLabel}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.textBtn} onPress={onDelete}>
            <Feather name="trash-2" size={14} color={colors.danger} />
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnLabel}>Save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.check}
        onPress={() => onTogglePacked(!item.packed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.packed }}
        accessibilityLabel={item.packed ? `Mark ${item.name} as not packed` : `Mark ${item.name} as packed`}
      >
        {item.packed ? (
          <View style={styles.checkFilled}>
            <Feather name="check" size={13} color="#fff" />
          </View>
        ) : (
          <View style={styles.checkOutline} />
        )}
      </Pressable>
      <Pressable style={styles.body} onPress={startEdit}>
        <MaterialCommunityIcons name={categoryIconName(item.category)} size={15} color={colors.muted} />
        <Text style={textStyles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
      <Text style={styles.qty}>×{item.quantity}</Text>
      <Feather name="edit-2" size={13} color={colors.mutedLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: { width: 22, alignItems: "center", justifyContent: "center" },
  checkFilled: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOutline: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.beigeDark,
  },
  body: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  qty: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted },
  editCard: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.card,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  editHeaderRow: { flexDirection: "row", gap: spacing.sm },
  photo: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.paleGreen },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
  },
  editRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink, minWidth: 18, textAlign: "center" },
  textBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  textBtnLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnLabel: { fontFamily: fonts.medium, fontSize: 13, color: "#fff" },
});
