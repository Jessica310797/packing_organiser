import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// expo-secure-store's web implementation is an empty stub (there's no
// browser equivalent of Keychain/Keystore) -- every method throws there.
// Native platforms (the actual target: Expo Go / a real device) use the
// real, properly-encrypted SecureStore; web falls back to localStorage so
// `npx expo start --web` still works for quick testing.
const isWeb = Platform.OS === "web";

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
