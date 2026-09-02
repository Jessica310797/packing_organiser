import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PackStackParamList } from "../navigation/types";
import type { PackingList, PackingListItem, PackingListSuggestion } from "../api/types";
import {
  addPackingListItem,
  deletePackingList,
  editPackingListItem,
  getPackingList,
  removePackingListItem,
  renamePackingList,
} from "../api/client";
import { PackingListItemRow } from "../components/PackingListItemRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors, fonts, formStyles, radius, spacing, textStyles } from "../theme";

type Props = NativeStackScreenProps<PackStackParamList, "PackingListDetail">;

export default function PackingListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const [list, setList] = useState<PackingList | null>(null);
  const [items, setItems] = useState<PackingListItem[] | null>(null);
  const [suggestions, setSuggestions] = useState<PackingListSuggestion[]>([]);
  const [listName, setListName] = useState(route.params.name);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(() => {
    getPackingList(listId).then((res) => {
      setList(res.list);
      setItems(res.items);
      setSuggestions(res.suggestions ?? []);
      setListName(res.list.name);
      navigation.setOptions({ title: res.list.name });
    });
  }, [listId, navigation]);

  useFocusEffect(load);

  async function addSuggestion(suggestion: PackingListSuggestion) {
    const item = await addPackingListItem(listId, {
      name: suggestion.name,
      category: suggestion.category,
      quantity: suggestion.quantity,
    });
    setItems((prev) => [...(prev ?? []), item]);
    setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
  }

  async function saveListName() {
    const trimmed = listName.trim();
    if (!trimmed || trimmed === list?.name) return;
    const updated = await renamePackingList(listId, trimmed);
    setList(updated);
    navigation.setOptions({ title: updated.name });
  }

  async function submitAdd() {
    if (!name.trim()) return;
    const trimmed = name.trim();
    const item = await addPackingListItem(listId, { name: trimmed, category: category.trim() || null, quantity: 1 });
    setItems((prev) => [...(prev ?? []), item]);
    setSuggestions((prev) => prev.filter((s) => s.name.toLowerCase() !== trimmed.toLowerCase()));
    setName("");
    setCategory("");
  }

  async function changeQuantity(item: PackingListItem, delta: number) {
    const quantity = Math.max(1, item.quantity + delta);
    const updated = await editPackingListItem(listId, item.id, { quantity });
    setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? updated : i)));
  }

  async function remove(item: PackingListItem) {
    await removePackingListItem(listId, item.id);
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
  }

  function confirmDeleteList() {
    Alert.alert("Delete list", `Delete "${list?.name}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePackingList(listId);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View>
        <Text style={textStyles.label}>List name</Text>
        <TextInput style={formStyles.input} value={listName} onChangeText={setListName} onBlur={saveListName} />
      </View>

      {items === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />}
      {items !== null && items.length === 0 && (
        <Text style={styles.empty}>No items yet -- add what you always take below.</Text>
      )}
      <View style={{ gap: spacing.xs }}>
        {(items ?? []).map((item) => (
          <PackingListItemRow
            key={item.id}
            item={item}
            onIncrement={() => changeQuantity(item, 1)}
            onDecrement={() => changeQuantity(item, -1)}
            onRemove={() => remove(item)}
          />
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <TextInput style={formStyles.input} placeholder="Item name" value={name} onChangeText={setName} />
        <TextInput
          style={formStyles.input}
          placeholder="Category (optional)"
          value={category}
          onChangeText={setCategory}
        />
        <PrimaryButton label="Add item" onPress={submitAdd} />
      </View>

      {suggestions.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={textStyles.title}>✨ Pakka suggests</Text>
          <View style={{ gap: spacing.xs }}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion.name}
                style={styles.suggestionRow}
                onPress={() => addSuggestion(suggestion)}
              >
                <View style={styles.suggestionPlus}>
                  <Feather name="plus" size={13} color={colors.green} />
                </View>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionCategory}>{suggestion.category}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={confirmDeleteList} style={styles.deleteRow}>
        <Feather name="trash-2" size={14} color={colors.danger} />
        <Text style={styles.deleteLabel}>Delete this list</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, fontSize: 14 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  suggestionPlus: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionName: { flex: 1, fontFamily: fonts.medium, fontSize: 14.5, color: colors.ink },
  suggestionCategory: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  deleteLabel: { color: colors.danger, fontSize: 14 },
});
