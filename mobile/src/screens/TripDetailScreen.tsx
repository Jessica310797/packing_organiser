import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import type { RootStackParamList } from "../navigation/types";
import type { IngestPhotoResult, InventoryItem, ReviewCandidate } from "../api/types";
import {
  addManualItem,
  editItem,
  getInventory,
  getReview,
  removeItem,
  resolveReview,
  uploadPhoto,
} from "../api/client";
import { colors, formStyles, radius, spacing, textStyles } from "../theme";
import { InventoryRow } from "../components/InventoryRow";
import { ReviewRow } from "../components/ReviewRow";
import { PrimaryButton } from "../components/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "TripDetail">;

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId, destination } = route.params;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [review, setReview] = useState<ReviewCandidate[]>([]);
  const [lastResult, setLastResult] = useState<IngestPhotoResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const refresh = useCallback(() => {
    getInventory(tripId).then(setInventory).catch((err) => Alert.alert("Error", err.message));
    getReview(tripId).then(setReview).catch(() => {});
  }, [tripId]);

  useFocusEffect(refresh);
  useEffect(() => navigation.setOptions({ title: destination }), [navigation, destination]);

  async function handlePicked(result: ImagePicker.ImagePickerResult) {
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0]!;
    setAnalyzing(true);
    try {
      const outcome = await uploadPhoto(tripId, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setLastResult(outcome);
      setInventory(outcome.inventory);
      refresh();
    } catch (err) {
      Alert.alert("Photo analysis failed", (err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Enable camera access to take packing photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    await handlePicked(result);
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo library permission needed", "Enable photo access to upload packing photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    await handlePicked(result);
  }

  async function changeQuantity(item: InventoryItem, delta: number) {
    const quantity = Math.max(1, item.quantity + delta);
    const updated = await editItem(tripId, item.id, { quantity });
    setInventory((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function handleRemove(item: InventoryItem) {
    await removeItem(tripId, item.id);
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function submitManualAdd() {
    if (!newName.trim()) return;
    const item = await addManualItem(tripId, {
      name: newName.trim(),
      category: newCategory.trim() || null,
      quantity: 1,
    });
    setInventory((prev) => [...prev, item]);
    setNewName("");
    setNewCategory("");
    setShowAddForm(false);
  }

  async function handleResolve(candidateId: string, action: Parameters<typeof resolveReview>[1]) {
    await resolveReview(candidateId, action);
    refresh();
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="📷 Take photo" onPress={takePhoto} loading={analyzing} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="🖼 Choose photo" onPress={pickFromLibrary} loading={analyzing} />
        </View>
      </View>

      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={textStyles.cardTitle}>Photo processed</Text>
          <Text style={textStyles.muted}>
            {lastResult.matchedCount} already packed (matched) · {lastResult.addedCount} new
            {lastResult.ambiguousCount > 0 ? ` · ${lastResult.ambiguousCount} need review` : ""}
          </Text>
        </View>
      )}

      <View>
        <Text style={textStyles.title}>Packed inventory ({inventory.length})</Text>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {inventory.length === 0 && (
            <Text style={textStyles.muted}>Nothing packed yet. Upload a photo or add manually.</Text>
          )}
          {inventory.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              onIncrement={() => changeQuantity(item, 1)}
              onDecrement={() => changeQuantity(item, -1)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </View>

        {!showAddForm ? (
          <Text style={styles.link} onPress={() => setShowAddForm(true)}>
            + Add item manually
          </Text>
        ) : (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <TextInput
              style={formStyles.input}
              placeholder="Item name"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={formStyles.input}
              placeholder="Category (optional)"
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <PrimaryButton label="Add item" onPress={submitManualAdd} />
          </View>
        )}
      </View>

      <View>
        <Text style={textStyles.title}>Needs your review ({review.length})</Text>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {review.length === 0 && <Text style={textStyles.muted}>Nothing waiting on you.</Text>}
          {review.map((candidate) => (
            <ReviewRow
              key={candidate.id}
              candidate={candidate}
              candidateItems={inventory.filter((i) => candidate.candidateItemIds.includes(i.id))}
              onConfirmMatch={(itemId) =>
                handleResolve(candidate.id, { action: "confirm_match", itemId })
              }
              onConfirmNew={() => handleResolve(candidate.id, { action: "confirm_new" })}
              onDiscard={() => handleResolve(candidate.id, { action: "discard" })}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = {
  resultBanner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  link: { color: colors.accent, fontWeight: "600" as const, marginTop: spacing.sm },
};
