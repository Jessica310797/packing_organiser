import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import type { WardrobeItem, WardrobePhotoResult } from "../api/types";
import {
  addWardrobeItem,
  editWardrobeItem,
  getWardrobe,
  removeWardrobeItem,
  uploadWardrobePhoto,
} from "../api/client";
import { colors, formStyles, radius, spacing, textStyles } from "../theme";
import { WardrobeRow } from "../components/WardrobeRow";
import { PrimaryButton } from "../components/PrimaryButton";

export default function WardrobeScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<WardrobePhotoResult | null>(null);

  const load = useCallback(() => {
    getWardrobe().then(setItems);
  }, []);

  useFocusEffect(load);

  async function handlePicked(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0]!;
    setAnalyzing(true);
    try {
      const outcome = await uploadWardrobePhoto({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setLastResult(outcome);
      setItems((prev) => [...(prev ?? []), ...outcome.added]);
    } catch (err) {
      Alert.alert("Photo analysis failed", (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Enable camera access to photograph what you own.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    await handlePicked(result);
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo library permission needed", "Enable photo access to add items from a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    await handlePicked(result);
  }

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
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.md, gap: spacing.md }}
    >
      <View>
        <Text style={textStyles.screenTitle}>Wardrobe</Text>
        <Text style={styles.subtitle}>
          Everything you own, in one place. Log what you buy here to build up recommendations for future trips.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Take photo" icon="camera" onPress={takePhoto} loading={analyzing} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Choose photo" icon="image" onPress={pickFromLibrary} loading={analyzing} />
        </View>
      </View>

      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={textStyles.cardTitle}>Photo processed</Text>
          <Text style={styles.subtitle}>
            {lastResult.added.length} added
            {lastResult.duplicateCount > 0 ? ` · ${lastResult.duplicateCount} already in your wardrobe` : ""}
          </Text>
        </View>
      )}

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
  resultBanner: {
    backgroundColor: colors.paleGreen,
    borderRadius: radius.card,
    padding: spacing.md,
  },
};
