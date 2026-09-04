import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PackStackParamList } from "../navigation/types";
import type { PackingList, PackingListCategory } from "../api/types";
import { createPackingList, listPackingLists } from "../api/client";
import { TRAVEL_TYPE_OPTIONS } from "../data/travelTypeOptions";
import { ACTIVITY_OPTIONS } from "../data/activityOptions";
import { chipStyles, colors, fonts, formStyles, radius, spacing, textStyles } from "../theme";

type Props = NativeStackScreenProps<PackStackParamList, "PackHome">;

const SECTIONS: { category: PackingListCategory; title: string; options?: string[] }[] = [
  { category: "travel_type", title: "Travel Types", options: TRAVEL_TYPE_OPTIONS },
  { category: "destination", title: "Destinations" },
  { category: "activity", title: "Activities", options: ACTIVITY_OPTIONS },
];

export default function PackScreen({ navigation }: Props) {
  const [lists, setLists] = useState<PackingList[] | null>(null);

  const load = useCallback(() => {
    listPackingLists().then(setLists);
  }, []);

  useFocusEffect(load);

  async function create(category: PackingListCategory, rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const { list } = await createPackingList(category, name);
    setLists((prev) => [...(prev ?? []), list]);
    navigation.navigate("PackingListDetail", { listId: list.id, name: list.name });
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
      <View>
        <Text style={textStyles.screenTitle}>Pack</Text>
        <Text style={styles.subtitle}>
          Build reusable lists for how you travel, where you go, and what you do -- pull from them for any trip.
        </Text>
      </View>

      {lists === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />}

      {lists !== null &&
        SECTIONS.map((section) => (
          <PackListSection
            key={section.category}
            title={section.title}
            category={section.category}
            options={section.options}
            lists={lists.filter((l) => l.category === section.category)}
            onOpen={(list) => navigation.navigate("PackingListDetail", { listId: list.id, name: list.name })}
            onCreate={(name) => create(section.category, name)}
          />
        ))}
    </ScrollView>
  );
}

function PackListSection({
  title,
  category,
  options,
  lists,
  onOpen,
  onCreate,
}: {
  title: string;
  category: PackingListCategory;
  options?: string[];
  lists: PackingList[];
  onOpen: (list: PackingList) => void;
  onCreate: (name: string) => void;
}) {
  const [customText, setCustomText] = useState("");
  const existingNames = new Set(lists.map((l) => l.name));
  const remainingOptions = (options ?? []).filter((option) => !existingNames.has(option));

  function addCustom() {
    if (!customText.trim()) return;
    onCreate(customText);
    setCustomText("");
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={textStyles.sectionTitle}>{title}</Text>

      {lists.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          {lists.map((list) => (
            <Pressable key={list.id} style={styles.card} onPress={() => onOpen(list)}>
              <Text style={textStyles.cardTitle}>{list.name}</Text>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {remainingOptions.length > 0 && (
        <View style={styles.chipWrap}>
          {remainingOptions.map((option) => (
            <Pressable key={option} style={chipStyles.chip} onPress={() => onCreate(option)}>
              <Text style={chipStyles.chipLabel}>+ {option}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[formStyles.input, { flex: 1 }]}
          placeholder={category === "destination" ? "e.g. Lisbon, City breaks" : "Add a custom list name"}
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
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  addRow: { flexDirection: "row", gap: spacing.sm },
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
