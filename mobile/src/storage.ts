import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackedItem } from "./types";

const STORAGE_KEY = "packing-organiser/packed-items";

export async function loadPackedItems(): Promise<PackedItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PackedItem[];
  } catch {
    return [];
  }
}

export async function savePackedItem(item: PackedItem): Promise<PackedItem[]> {
  const items = await loadPackedItems();
  const updated = [item, ...items];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function deletePackedItem(id: string): Promise<PackedItem[]> {
  const items = await loadPackedItems();
  const updated = items.filter((item) => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
