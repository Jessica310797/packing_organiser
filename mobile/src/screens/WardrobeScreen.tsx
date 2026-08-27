import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { WardrobeItem } from "../api/types";
import { addWardrobeItem, editWardrobeItem, getWardrobe, removeWardrobeItem } from "../api/client";
import { colors, formStyles, spacing, textStyles } from "../theme";
import { WardrobeRow } from "../components/WardrobeRow";
import { PrimaryButton } from "../components/PrimaryButton";

export default function WardrobeScreen() {
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(() => {
    getWardrobe().then(setItems);
  }, []);

  useFocusEffect(load);

  async function submitAdd() {
    if (!name.trim()) return;
    const item = await addWardrobeItem({ name: name.trim(), category: category.trim() || null, quantity: 1 });
    setItems((prev) => [...(prev ?? []), item]);
    setName("");
    setCategory("");
  }

  async function changeQuantity(item: WardrobeItem, delta: number) {
    const quantity = Math.max(1, item.quantity + delta);
    const updated = await editWardrobeItem(item.id, { quantity });
    setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? updated : i)));
  }

  async function remove(item: WardrobeItem) {
    await removeWardrobeItem(item.id);
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View>
        <Text style={textStyles.screenTitle}>Wardrobe</Text>
        <Text style={styles.subtitle}>
          Everything you own, in one place. Log what you buy here to build up recommendations for future trips.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <TextInput style={formStyles.input} placeholder="Item name" value={name} onChangeText={setName} />
        <TextInput
          style={formStyles.input}
          placeholder="Category (optional)"
          value={category}
          onChangeText={setCategory}
        />
        <PrimaryButton label="Add to wardrobe" onPress={submitAdd} />
      </View>

      {items === null && <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />}
      {items !== null && items.length === 0 && (
        <Text style={styles.empty}>Nothing logged yet -- add an item above.</Text>
      )}
      <View style={{ gap: spacing.xs }}>
        {(items ?? []).map((item) => (
          <WardrobeRow
            key={item.id}
            item={item}
            onIncrement={() => changeQuantity(item, 1)}
            onDecrement={() => changeQuantity(item, -1)}
            onRemove={() => remove(item)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = {
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  empty: { color: colors.muted, fontSize: 14 },
};
