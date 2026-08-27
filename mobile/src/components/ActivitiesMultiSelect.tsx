import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { ACTIVITY_OPTIONS } from "../data/activityOptions";
import { chipStyles, colors, formStyles, radius, spacing } from "../theme";

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
              style={[chipStyles.chip, selected && chipStyles.chipSelected, styles.chipRow]}
              onPress={() => toggle(activity)}
            >
              {selected && <Feather name="check" size={13} color={colors.green} />}
              <Text style={[chipStyles.chipLabel, selected && chipStyles.chipLabelSelected]}>{activity}</Text>
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
          <Feather name="plus" size={16} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chipRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  addButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
