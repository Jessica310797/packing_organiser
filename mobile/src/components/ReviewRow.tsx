import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InventoryItem, ReviewCandidate } from "../api/types";
import { colors, formStyles, radius, textStyles } from "../theme";

export function ReviewRow({
  candidate,
  candidateItems,
  onConfirmMatch,
  onConfirmNew,
  onDiscard,
}: {
  candidate: ReviewCandidate;
  candidateItems: InventoryItem[];
  onConfirmMatch: (itemId: string) => void;
  onConfirmNew: () => void;
  onDiscard: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={textStyles.cardTitle}>{candidate.detectedName}</Text>
      {candidate.detectedCategory && <Text style={textStyles.muted}>{candidate.detectedCategory}</Text>}
      <Text style={[textStyles.muted, { marginTop: 4 }]}>Not sure if this is a repeat or new.</Text>

      <View style={styles.actions}>
        {candidateItems.map((item) => (
          <Pressable
            key={item.id}
            style={formStyles.buttonSecondary}
            onPress={() => onConfirmMatch(item.id)}
          >
            <Text style={formStyles.buttonSecondaryLabel}>Same as: {item.name}</Text>
          </Pressable>
        ))}
        <Pressable style={formStyles.buttonSecondary} onPress={onConfirmNew}>
          <Text style={formStyles.buttonSecondaryLabel}>It's new</Text>
        </Pressable>
        <Pressable style={formStyles.buttonSecondary} onPress={onDiscard}>
          <Text style={[formStyles.buttonSecondaryLabel, { color: colors.danger }]}>Discard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.warnBg,
    borderRadius: radius.md,
    padding: 14,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
});
