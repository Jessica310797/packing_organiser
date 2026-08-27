import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ACTIVITY_OPTIONS } from "../data/activityOptions";
import { chipStyles, colors, formStyles, spacing } from "../theme";

export function ActivitiesMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (activities: string[]) => void;
}) {
  const [customText, setCustomText] = useState("");

  // Anything selected that isn't one of the predefined options (added via
  // "custom") still needs to render as its own removable chip.
  const customSelected = value.filter((v) => !ACTIVITY_OPTIONS.includes(v));
  const allChips = [...ACTIVITY_OPTIONS, ...customSelected];

  function toggle(activity: string) {
    if (value.includes(activity)) {
      onChange(value.filter((v) => v !== activity));
    } else {
      onChange([...value, activity]);
    }
  }

  function addCustom() {
    const trimmed = customText.trim();
    if (trimmed.length === 0 || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomText("");
  }

  return (
    <View>
      <View style={styles.chipWrap}>
        {allChips.map((activity) => {
          const selected = value.includes(activity);
          return (
            <Pressable
              key={activity}
              style={[chipStyles.chip, selected && chipStyles.chipSelected]}
              onPress={() => toggle(activity)}
            >
              <Text style={[chipStyles.chipLabel, selected && chipStyles.chipLabelSelected]}>
                {selected ? "✓ " : ""}
                {activity}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[formStyles.input, { flex: 1 }]}
          placeholder="Add another activity"
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={addCustom}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addCustom}>
          <Text style={styles.addButtonLabel}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  addButton: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonLabel: { color: colors.ink, fontWeight: "600", fontSize: 14 },
});
