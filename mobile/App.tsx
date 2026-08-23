import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";

import { identifyItem as callIdentifyItem, ApiError } from "./src/api";
import { deletePackedItem, loadPackedItems, savePackedItem } from "./src/storage";
import { IdentifiedItem, PackedItem } from "./src/types";

export default function App() {
  const [text, setText] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<IdentifiedItem | undefined>(undefined);
  const [packedItems, setPackedItems] = useState<PackedItem[]>([]);

  useEffect(() => {
    loadPackedItems().then(setPackedItems);
  }, []);

  const pickPhoto = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow access to continue.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setResult(undefined);
      setError(undefined);
    }
  };

  const handleIdentify = async () => {
    if (!text.trim() && !photoUri) {
      setError("Add a photo or a short description first.");
      return;
    }
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const item = await callIdentifyItem({ text: text.trim() || undefined, photoUri });
      setResult(item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPackedList = async () => {
    if (!result) return;
    const item: PackedItem = {
      ...result,
      id: `${Date.now()}`,
      photoUri,
      createdAt: new Date().toISOString(),
    };
    const updated = await savePackedItem(item);
    setPackedItems(updated);
    setText("");
    setPhotoUri(undefined);
    setResult(undefined);
  };

  const handleDelete = async (id: string) => {
    const updated = await deletePackedItem(id);
    setPackedItems(updated);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Packing Organiser</Text>
        <Text style={styles.subtitle}>Identify an item</Text>

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewPlaceholder]}>
            <Text style={styles.previewPlaceholderText}>No photo yet</Text>
          </View>
        )}

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={() => pickPhoto("camera")}>
            <Text style={styles.secondaryButtonText}>Take photo</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => pickPhoto("library")}>
            <Text style={styles.secondaryButtonText}>Choose photo</Text>
          </Pressable>
          {photoUri && (
            <Pressable style={styles.secondaryButton} onPress={() => setPhotoUri(undefined)}>
              <Text style={styles.secondaryButtonText}>Remove</Text>
            </Pressable>
          )}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Describe the item (optional if you added a photo)"
          value={text}
          onChangeText={setText}
        />

        <Pressable
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleIdentify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Identify item</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>{result.name}</Text>
              <Text style={styles.badge}>{result.category}</Text>
            </View>
            <Text style={styles.resultDescription}>{result.description}</Text>
            <Text style={styles.confidence}>Confidence: {result.confidence}</Text>
            <Pressable style={styles.primaryButton} onPress={handleAddToPackedList}>
              <Text style={styles.primaryButtonText}>Add to packed list</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.subtitle}>Packed items ({packedItems.length})</Text>
        {packedItems.length === 0 ? (
          <Text style={styles.emptyText}>Nothing identified yet.</Text>
        ) : (
          <FlatList
            data={packedItems}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                {item.photoUri && <Image source={{ uri: item.photoUri }} style={styles.listItemImage} />}
                <View style={styles.listItemBody}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <Text style={styles.listItemCategory}>{item.category}</Text>
                </View>
                <Pressable onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Remove</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  previewPlaceholder: { alignItems: "center", justifyContent: "center" },
  previewPlaceholderText: { color: "#999" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: { color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#dc2626" },
  resultCard: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: "#fafafa",
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultName: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  badge: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  resultDescription: { color: "#444" },
  confidence: { color: "#777", fontSize: 12 },
  emptyText: { color: "#999" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listItemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#f0f0f0" },
  listItemBody: { flex: 1 },
  listItemName: { fontWeight: "600" },
  listItemCategory: { color: "#777", fontSize: 12 },
  deleteText: { color: "#dc2626" },
});
