import AsyncStorage from "@react-native-async-storage/async-storage";

const NAME_KEY = "pakka:userName";

export async function getUserName(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(NAME_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(NAME_KEY, name.trim());
}
