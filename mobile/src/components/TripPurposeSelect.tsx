import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OTHER_PURPOSE, TRIP_PURPOSES } from "../data/tripPurposes";
import { colors, formStyles, radius, spacing } from "../theme";

export function TripPurposeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (purpose: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  const isKnownOption = TRIP_PURPOSES.includes(value) && value !== OTHER_PURPOSE;
  const selectedOption = isKnownOption ? value : value ? OTHER_PURPOSE : "";
  const customText = isKnownOption ? "" : value;

  function selectOption(option: string) {
    setModalVisible(false);
    onChange(option === OTHER_PURPOSE ? "" : option);
  }

  return (
    <View>
      <Pressable style={styles.select} onPress={() => setModalVisible(true)}>
        <Text style={selectedOption ? styles.selectText : styles.placeholderText}>
          {selectedOption || "Select trip purpose"}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      {selectedOption === OTHER_PURPOSE && (
        <TextInput
          style={[formStyles.input, { marginTop: spacing.sm }]}
          placeholder="Describe the trip purpose"
          value={customText}
          onChangeText={onChange}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Trip purpose</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {TRIP_PURPOSES.map((option) => {
                const isSelected = option === selectedOption;
                return (
                  <Pressable key={option} style={styles.row} onPress={() => selectOption(option)}>
                    <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>{option}</Text>
                    {isSelected && <Text style={styles.check}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 15, color: colors.ink },
  placeholderText: { fontSize: 15, color: colors.mutedLight },
  chevron: { fontSize: 16, color: colors.muted },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { fontSize: 15, color: colors.ink },
  rowTextSelected: { color: colors.accent, fontWeight: "700" },
  check: { color: colors.accent, fontWeight: "700", fontSize: 16 },
});
