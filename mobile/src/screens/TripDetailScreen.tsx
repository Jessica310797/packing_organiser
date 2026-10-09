import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ParamListBase } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import type { TripDetailParams } from "../navigation/types";
import type { InventoryItem, IngestPhotoResult, RecommendedItem, ReviewCandidate, Trip } from "../api/types";
import {
  addManualItem,
  editItem,
  getInventory,
  getRecommendations,
  getReview,
  getTrip,
  getWeather,
  removeItem,
  resolveReview,
  uploadPhoto,
  type TripWeather,
} from "../api/client";
import { colors, formStyles, fonts, radius, spacing, textStyles } from "../theme";
import { PackedChecklistRow, type PackedItemPatch } from "../components/PackedChecklistRow";
import { SuggestionRow, type PackInput } from "../components/SuggestionRow";
import { PackingProgressBar } from "../components/PackingProgressBar";
import { TripContextBar } from "../components/TripContextBar";
import { ReviewRow } from "../components/ReviewRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { PhaseTabs, type Phase } from "../components/PhaseTabs";
import { buildChecklist } from "../lib/checklist";
import { categoryIconName } from "../lib/categoryIcon";
import type { CategoryGroup } from "../lib/categoryGroups";
import { addDays, formatDateWithWeekday } from "../lib/dates";
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
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [weather, setWeather] = useState<TripWeather | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [review, setReview] = useState<ReviewCandidate[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [lastResult, setLastResult] = useState<IngestPhotoResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPacked, setNewPacked] = useState(true);
  const [phase, setPhase] = useState<Phase>("packing");
  const [showPacked, setShowPacked] = useState(false);

  const refreshRecommendations = useCallback(() => {
    return getRecommendations(tripId).then(setRecommendations).catch(() => {});
  }, [tripId]);

  const refresh = useCallback(() => {
    getInventory(tripId).then(setInventory).catch((err) => Alert.alert("Error", err.message));
    getReview(tripId).then(setReview).catch(() => {});
    refreshRecommendations();
  }, [tripId, refreshRecommendations]);

  useFocusEffect(refresh);
  useEffect(() => navigation.setOptions({ title: destination }), [navigation, destination]);

  // The trip's own details (dates/purpose) and forecast don't change while
  // viewing this screen, so these load once rather than on every focus.
  useEffect(() => {
    getTrip(tripId).then(setTrip).catch(() => {});
    getWeather(tripId).then(setWeather).catch(() => {});
  }, [tripId]);

  function goToPhase(next: Phase) {
    setPhase(next);
    pagerRef.current?.scrollTo({ x: next === "packing" ? 0 : width, animated: true });
  }

  function handlePagerScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setPhase(page === 0 ? "packing" : "itinerary");
  }

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

  function takeVideo() {
    Alert.alert("Coming soon", "Video analysis is still in testing -- take a photo for now.");
  }

  /** Moves a real item between "packed" and "to pack" -- it stays, it never just vanishes. */
  async function togglePacked(item: InventoryItem, packed: boolean) {
    const updated = await editItem(tripId, item.id, { packed });
    setInventory((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    await refreshRecommendations();
  }

  /** Genuinely removes an item -- only reachable from the edit view's trash icon, never the checkbox. */
  async function deleteItem(item: InventoryItem) {
    await removeItem(tripId, item.id);
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    await refreshRecommendations();
  }

  async function saveItemEdit(item: InventoryItem, patch: PackedItemPatch) {
    const updated = await editItem(tripId, item.id, patch);
    setInventory((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    await refreshRecommendations();
  }

  async function submitManualAdd() {
    if (!newName.trim()) return;
    const item = await addManualItem(tripId, {
      name: newName.trim(),
      category: newCategory.trim() || null,
      quantity: 1,
      packed: newPacked,
    });
    setInventory((prev) => [...prev, item]);
    setNewName("");
    setNewCategory("");
    setNewPacked(true);
    setShowAddForm(false);
    refreshRecommendations();
  }

  async function handleResolve(candidateId: string, action: Parameters<typeof resolveReview>[1]) {
    await resolveReview(candidateId, action);
    refresh();
  }

  /**
   * Packs a suggestion, as-is or personalized (name/category/quantity edited
   * by the user first). The new item's name matches the recommendation
   * closely enough in the common (as-is) case to flip it to "packed" status
   * on refresh, at which point it disappears from the suggestions list and
   * shows as a normal packed row instead -- a personalized name may not
   * re-match, which is fine: it's just a real item now either way.
   */
  async function packRecommendation(input: PackInput) {
    const newItem = await addManualItem(tripId, input);
    setInventory((prev) => [...prev, newItem]);
    await refreshRecommendations();
  }

  const checklist = buildChecklist(inventory, recommendations);
  const toPackNames = checklist.toPackGroups.flatMap((g) => g.items.map((i) => i.name));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md }}>
        {trip && <TripContextBar trip={trip} weather={weather} />}
        <PhaseTabs active={phase} onChange={goToPhase} />
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePagerScrollEnd}
        style={{ flex: 1, marginTop: spacing.sm }}
      >
        <View style={{ width }}>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Take photo" icon="camera" onPress={takePhoto} loading={analyzing} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Take video" icon="video" onPress={takeVideo} />
                </View>
              </View>
              <Text style={styles.captureHint}>Video analysis is still in testing -- photo works today</Text>
              <Text style={styles.link} onPress={pickFromLibrary}>
                Choose from library instead
              </Text>

              {lastResult && (
                <View style={styles.resultBanner}>
                  <Text style={textStyles.cardTitle}>Photo processed</Text>
                  <Text style={textStyles.muted}>
                    {lastResult.matchedCount} already packed (matched) · {lastResult.addedCount} new
                    {lastResult.ambiguousCount > 0 ? ` · ${lastResult.ambiguousCount} need review` : ""}
                  </Text>
                </View>
              )}
            </View>

            <PackingProgressBar packed={checklist.totalPacked} total={checklist.totalRecommended} />

            <View style={{ gap: spacing.sm }}>
              <Pressable style={styles.packedToggle} onPress={() => setShowPacked((s) => !s)}>
                <View style={styles.packedCheckBadge}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
                <Text style={styles.packedToggleLabel}>Packed · {checklist.packedCount} items</Text>
                <Feather name={showPacked ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              </Pressable>
              {showPacked && (
                <View style={{ gap: spacing.md }}>
                  {checklist.packedGroups.length === 0 && (
                    <Text style={textStyles.muted}>Nothing packed yet -- upload a photo or tick something off below.</Text>
                  )}
                  {checklist.packedGroups.map((group) => (
                    <CategoryGroupCard
                      key={group.key}
                      group={group}
                      onTogglePacked={togglePacked}
                      onDelete={deleteItem}
                      onSave={saveItemEdit}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={textStyles.title}>To pack ({checklist.toPackCount})</Text>
              {checklist.toPackGroups.length === 0 && (
                <Text style={textStyles.muted}>Nothing on the list yet.</Text>
              )}
              {checklist.toPackGroups.map((group) => (
                <CategoryGroupCard
                  key={group.key}
                  group={group}
                  onTogglePacked={togglePacked}
                  onDelete={deleteItem}
                  onSave={saveItemEdit}
                />
              ))}

              {!showAddForm ? (
                <Text style={styles.link} onPress={() => setShowAddForm(true)}>
                  + Add item manually
                </Text>
              ) : (
                <View style={{ gap: spacing.sm }}>
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
                  <View style={styles.packedToggleRow}>
                    <Pressable
                      style={[styles.packedToggleBtn, newPacked && styles.packedToggleBtnActive]}
                      onPress={() => setNewPacked(true)}
                    >
                      <Text style={[styles.packedToggleBtnLabel, newPacked && styles.packedToggleBtnLabelActive]}>
                        Already packed
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.packedToggleBtn, !newPacked && styles.packedToggleBtnActive]}
                      onPress={() => setNewPacked(false)}
                    >
                      <Text style={[styles.packedToggleBtnLabel, !newPacked && styles.packedToggleBtnLabelActive]}>
                        Still to pack
                      </Text>
                    </Pressable>
                  </View>
                  <PrimaryButton label="Add item" onPress={submitManualAdd} />
                </View>
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={textStyles.title}>✨ Pakka recommends ({checklist.suggestions.length})</Text>
              <Text style={styles.recommendedHint}>
                Based on this trip's purpose, activities, length, and forecast -- pack it as-is, tap the pencil to
                make it yours, or add it via photo.
              </Text>
              {checklist.suggestions.length === 0 && (
                <Text style={textStyles.muted}>
                  {checklist.packedCount > 0 ? "Nothing else suggested -- nice work." : "No suggestions yet."}
                </Text>
              )}
              {checklist.suggestions.map((item) => (
                <SuggestionRow key={item.name} item={item} onPack={packRecommendation} onTakePhoto={takePhoto} />
              ))}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={textStyles.title}>Needs your review ({review.length})</Text>
              {review.length === 0 && <Text style={textStyles.muted}>Nothing waiting on you.</Text>}
              {review.map((candidate) => (
                <ReviewRow
                  key={candidate.id}
                  candidate={candidate}
                  candidateItems={inventory.filter((i) => candidate.candidateItemIds.includes(i.id))}
                  onConfirmMatch={(itemId) => handleResolve(candidate.id, { action: "confirm_match", itemId })}
                  onConfirmNew={() => handleResolve(candidate.id, { action: "confirm_new" })}
                  onDiscard={() => handleResolve(candidate.id, { action: "discard" })}
                />
              ))}
            </View>

            <Pressable style={styles.phaseLinkBtn} onPress={() => goToPhase("itinerary")}>
              <Text style={styles.phaseLinkLabel}>All packed? See your itinerary</Text>
              <Feather name="chevron-right" size={14} color={colors.green} />
            </Pressable>
          </ScrollView>
        </View>

        <View style={{ width }}>
          <ScrollView
            nestedScrollEnabled
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
          >
            <View>
              <Text style={textStyles.cardTitleSerif}>Your itinerary</Text>
              <Text style={styles.recommendedHint}>What you'll use, day by day.</Text>
            </View>

            {trip &&
              Array.from({ length: trip.durationDays }, (_, i) => i).map((dayIndex) => (
                <View key={dayIndex} style={styles.dayCard}>
                  <View style={styles.dayHeaderRow}>
                    <View style={styles.dayBadge}>
                      <Feather name="calendar" size={16} color={colors.green} />
                    </View>
                    <View>
                      <Text style={styles.dayDateLabel}>
                        {formatDateWithWeekday(addDays(trip.startDate, dayIndex))} · Day {dayIndex + 1}
                      </Text>
                      <Text style={textStyles.cardTitle}>
                        {checklist.totalPacked}/{checklist.totalRecommended} packed overall
                      </Text>
                    </View>
                  </View>
                  {toPackNames.length > 0 ? (
                    <Text style={styles.stillToPackText}>
                      Still to pack: {toPackNames.slice(0, 4).join(", ")}
                      {toPackNames.length > 4 ? ` +${toPackNames.length - 4} more` : ""}
                    </Text>
                  ) : (
                    <Text style={styles.stillToPackText}>Everything's packed for this trip.</Text>
                  )}
                </View>
              ))}

            {trip && trip.activities.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.categoryLabel}>Planned activities</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {trip.activities.map((activity) => (
                    <View key={activity} style={styles.activityChip}>
                      <Text style={styles.activityChipLabel}>{activity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable style={styles.phaseLinkBtn} onPress={() => goToPhase("packing")}>
              <Feather name="chevron-left" size={14} color={colors.green} />
              <Text style={styles.phaseLinkLabel}>Back to packing</Text>
            </Pressable>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
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

function CategoryGroupCard({
  group,
  onTogglePacked,
  onDelete,
  onSave,
}: {
  group: CategoryGroup<InventoryItem>;
  onTogglePacked: (item: InventoryItem, packed: boolean) => void;
  onDelete: (item: InventoryItem) => void;
  onSave: (item: InventoryItem, patch: PackedItemPatch) => Promise<void>;
}) {
  return (
    <View style={styles.categoryCard}>
      <CategoryHeader categoryKey={group.key} label={group.label} count={group.items.length} />
      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        {group.items.map((item) => (
          <PackedChecklistRow
            key={item.id}
            item={item}
            onTogglePacked={(packed) => onTogglePacked(item, packed)}
            onDelete={() => onDelete(item)}
            onSave={(patch) => onSave(item, patch)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = {
  resultBanner: {
    backgroundColor: colors.paleGreen,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  link: { color: colors.green, fontFamily: fonts.semiBold, fontSize: 14 },
  captureHint: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.mutedLight, textAlign: "center" as const },
  recommendedHint: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  categoryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  categoryLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.green,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  categoryCount: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  categoryCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  packedToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.sm,
  },
  packedCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  packedToggleLabel: { flex: 1, fontFamily: fonts.semiBold, fontSize: 14, color: colors.ink },
  packedToggleRow: { flexDirection: "row" as const, gap: spacing.sm },
  packedToggleBtn: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    alignItems: "center" as const,
  },
  packedToggleBtnActive: { backgroundColor: colors.paleGreen, borderColor: colors.green },
  packedToggleBtnLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  packedToggleBtnLabelActive: { color: colors.green, fontFamily: fonts.semiBold },
  phaseLinkBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: spacing.sm,
  },
  phaseLinkLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.green },
  dayCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.cardLarge,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dayHeaderRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  dayBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.paleGreen,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dayDateLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  stillToPackText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  activityChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  activityChipLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
};
