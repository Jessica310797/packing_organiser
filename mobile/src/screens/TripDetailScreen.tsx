import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ParamListBase } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import type { TripDetailParams } from "../navigation/types";
import type { IngestPhotoResult, InventoryItem, RecommendedItem, ReviewCandidate } from "../api/types";
import {
  addManualItem,
  editItem,
  getInventory,
  getRecommendations,
  getReview,
  removeItem,
  resolveReview,
  uploadPhoto,
} from "../api/client";
import { colors, formStyles, fonts, radius, spacing, textStyles } from "../theme";
import { InventoryRow } from "../components/InventoryRow";
import { ReviewRow } from "../components/ReviewRow";
import { RecommendationChecklistRow } from "../components/RecommendationChecklistRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { CATEGORY_LABELS, CATEGORY_ORDER, groupByCategory } from "../lib/categoryGroups";
import { categoryIconName } from "../lib/categoryIcon";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

// Reachable from both the Trips tab's stack and the Pack tab's stack, so
// this is typed loosely against a generic navigator rather than one
// specific stack's full param list (this screen never navigates onward
// itself -- only setOptions -- so nothing is lost).
type Props = {
  route: { key: string; name: string; params: TripDetailParams };
  navigation: NativeStackNavigationProp<ParamListBase>;
};

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId, destination } = route.params;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [review, setReview] = useState<ReviewCandidate[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [lastResult, setLastResult] = useState<IngestPhotoResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const refreshRecommendations = useCallback(() => {
    getRecommendations(tripId).then(setRecommendations).catch(() => {});
  }, [tripId]);

  const refresh = useCallback(() => {
    getInventory(tripId).then(setInventory).catch((err) => Alert.alert("Error", err.message));
    getReview(tripId).then(setReview).catch(() => {});
    refreshRecommendations();
  }, [tripId, refreshRecommendations]);

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
    refreshRecommendations();
  }

  async function handleRemove(item: InventoryItem) {
    await removeItem(tripId, item.id);
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    refreshRecommendations();
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
    refreshRecommendations();
  }

  async function handleResolve(candidateId: string, action: Parameters<typeof resolveReview>[1]) {
    await resolveReview(candidateId, action);
    refresh();
  }

  /**
   * Marks a recommended-but-not-fully-packed item as packed: adds an
   * inventory item covering whatever's still short (not the full
   * recommended quantity, in case some was already packed). The new item's
   * name matches the recommendation's, so it flips to "packed" status on
   * the next refresh and this row disappears from the checklist in favor
   * of the real packed row -- no separate "confirm" step needed.
   */
  async function markRecommendationPacked(item: RecommendedItem) {
    const deficit = Math.max(1, item.recommendedQuantity - item.packedQuantity);
    const newItem = await addManualItem(tripId, { name: item.name, category: item.category, quantity: deficit });
    setInventory((prev) => [...prev, newItem]);
    await refreshRecommendations();
  }

  // One merged checklist per category: real packed items plus any
  // recommendation for that category that isn't fully packed yet. A
  // recommendation that reaches "packed" status simply stops appearing here
  // (it's already represented by the matching packed item above it).
  const packedByCategory = new Map(groupByCategory(inventory, (item) => item.category).map((g) => [g.key, g.items]));
  const neededByCategory = new Map(
    groupByCategory(
      recommendations.filter((r) => r.status !== "packed"),
      (item) => item.category,
    ).map((g) => [g.key, g.items]),
  );
  const checklistGroups = CATEGORY_ORDER.filter(
    (key) => packedByCategory.has(key) || neededByCategory.has(key),
  ).map((key) => ({
    key,
    label: CATEGORY_LABELS[key]!,
    packed: packedByCategory.get(key) ?? [],
    needed: neededByCategory.get(key) ?? [],
  }));

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
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
          <Text style={textStyles.muted}>
            {lastResult.matchedCount} already packed (matched) · {lastResult.addedCount} new
            {lastResult.ambiguousCount > 0 ? ` · ${lastResult.ambiguousCount} need review` : ""}
          </Text>
        </View>
      )}

      <View>
        <Text style={textStyles.title}>Packing checklist ({inventory.length} packed)</Text>
        <Text style={styles.recommendedHint}>
          What you've packed, plus suggestions based on this trip's purpose, activities, length, and
          forecast -- tap a suggestion once you've packed it.
        </Text>
        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          {checklistGroups.length === 0 && (
            <Text style={textStyles.muted}>Nothing packed or suggested yet. Upload a photo or add manually.</Text>
          )}
          {checklistGroups.map((group) => (
            <View key={group.key} style={{ gap: spacing.xs }}>
              <CategoryHeader categoryKey={group.key} label={group.label} count={group.packed.length} />
              {group.packed.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  onIncrement={() => changeQuantity(item, 1)}
                  onDecrement={() => changeQuantity(item, -1)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
              {group.needed.map((item) => (
                <RecommendationChecklistRow
                  key={item.name}
                  item={item}
                  onMarkPacked={() => markRecommendationPacked(item)}
                />
              ))}
            </View>
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

function CategoryHeader({ categoryKey, label, count }: { categoryKey: string; label: string; count: number }) {
  return (
    <View style={styles.categoryHeader}>
      <MaterialCommunityIcons name={categoryIconName(categoryKey)} size={14} color={colors.green} />
      <Text style={styles.categoryLabel}>{label}</Text>
      <Text style={styles.categoryCount}>{count}</Text>
    </View>
  );
}

const styles = {
  resultBanner: {
    backgroundColor: colors.paleGreen,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  link: { color: colors.green, fontFamily: fonts.semiBold, fontSize: 14, marginTop: spacing.sm },
  recommendedHint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  categoryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: spacing.xs,
  },
  categoryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.green,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  categoryCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
};
