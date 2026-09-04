import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { RecommendedItem } from "../api/types";
import { colors, fonts, radius, spacing } from "../theme";

export interface PackInput {
  name: string;
  category: string | null;
  quantity: number;
}

const REASON_TRUNCATE_LENGTH = 68;

/**
 * A Pakka suggestion, styled as a gentle "here's what we think you'll need"
 * card rather than a warning -- soft cream background, a sparkle eyebrow,
 * no red/amber "you forgot something" framing. The circular "+" packs it
 * as-is (fast path); the pencil opens an inline form to personalize the
 * name/category/quantity before it becomes a real item; the camera hands
 * off to the trip's existing photo flow.
 */
export function SuggestionRow({
  item,
  onPack,
  onTakePhoto,
}: {
  item: RecommendedItem;
  onPack: (input: PackInput) => Promise<void>;
  onTakePhoto: () => void;
}) {
  const [packing, setPacking] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deficit = Math.max(1, item.recommendedQuantity - item.packedQuantity);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(deficit);

  const reasonText = item.reasons.join(" · ");
  const isLong = reasonText.length > REASON_TRUNCATE_LENGTH;
  const shownReason = !isLong || expanded ? reasonText : `${reasonText.slice(0, REASON_TRUNCATE_LENGTH)}…`;

  async function packAsIs() {
    if (packing) return;
    setPacking(true);
    try {
      await onPack({ name: item.name, category: item.category, quantity: deficit });
    } finally {
      setPacking(false);
    }
  }

  function startCustomize() {
    setName(item.name);
    setCategory(item.category);
    setQuantity(deficit);
    setCustomizing(true);
  }

  async function saveCustom() {
    if (!name.trim() || packing) return;
    setPacking(true);
    try {
      await onPack({ name: name.trim(), category: category.trim() || null, quantity: Math.max(1, quantity) });
      setCustomizing(false);
    } finally {
      setPacking(false);
    }
  }

  if (customizing) {
    return (
      <View style={styles.editCard}>
        <TextInput style={styles.editInput} value={name} onChangeText={setName} placeholder="Item name" />
        <TextInput
          style={styles.editInput}
          value={category ?? ""}
          onChangeText={setCategory}
          placeholder="Category"
        />
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
          <Pressable style={styles.textBtn} onPress={() => setCustomizing(false)}>
            <Text style={styles.textBtnLabel}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={saveCustom} disabled={packing}>
            {packing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnLabel}>Pack it</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>✨ PAKKA SUGGESTS</Text>
      </View>
      <View style={styles.mainRow}>
        <Pressable
          style={styles.toggle}
          onPress={packAsIs}
          disabled={packing}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: false, disabled: packing }}
          accessibilityLabel={`Mark ${item.name} as packed`}
        >
          {packing ? (
            <ActivityIndicator size="small" color={colors.green} />
          ) : (
            <View style={styles.toggleCircle}>
              <Feather name="plus" size={13} color={colors.green} />
            </View>
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          {reasonText.length > 0 && (
            <Pressable onPress={() => isLong && setExpanded((e) => !e)}>
              <Text style={styles.reason}>
                {shownReason}
                {isLong && <Text style={styles.why}> {expanded ? "Show less" : "Why?"}</Text>}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.quantity}>
          {item.packedQuantity > 0 ? `${item.packedQuantity}/${item.recommendedQuantity}` : `+${deficit}`}
        </Text>
        <Pressable style={styles.iconBtn} onPress={startCustomize} accessibilityLabel={`Customize ${item.name}`}>
          <Feather name="edit-2" size={14} color={colors.muted} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onTakePhoto} accessibilityLabel={`Add ${item.name} via photo`}>
          <Feather name="camera" size={14} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.sm,
    gap: 4,
  },
  eyebrowRow: { flexDirection: "row" },
  eyebrow: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    color: colors.green,
    letterSpacing: 0.6,
  },
  mainRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toggle: { width: 26, alignItems: "center", justifyContent: "center" },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink },
  reason: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  why: { fontFamily: fonts.semiBold, color: colors.green },
  quantity: { fontFamily: fonts.semiBold, fontSize: 12.5, color: colors.green },
  iconBtn: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  editCard: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.card,
    padding: spacing.sm,
    gap: spacing.sm,
  },
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
  saveBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnLabel: { fontFamily: fonts.medium, fontSize: 13, color: "#fff" },
});
