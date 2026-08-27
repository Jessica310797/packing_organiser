import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "../lib/authContext";
import { updateMyName } from "../api/client";
import { colors, formStyles, radius, spacing, textStyles } from "../theme";

export default function ProfileScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");

  useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;
    try {
      const updated = await updateMyName(trimmed);
      refreshUser(updated);
    } catch (err) {
      Alert.alert("Couldn't save name", (err as Error).message);
    }
  }

  function handleSignOut() {
    Alert.alert("Log out?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Feather name="user" size={28} color={colors.ink} />
      </View>
      <Text style={textStyles.title}>Profile</Text>
      {user && <Text style={styles.email}>{user.email}</Text>}

      <View style={styles.field}>
        <Text style={textStyles.label}>Your name</Text>
        <TextInput
          style={formStyles.input}
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          placeholder="e.g. Jess"
        />
      </View>

      <Text style={styles.logout} onPress={handleSignOut}>
        Log out
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", padding: spacing.lg, paddingTop: 80, gap: spacing.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.beige,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  email: { ...textStyles.muted },
  field: { width: "100%", marginTop: spacing.lg },
  logout: { ...textStyles.body, color: colors.danger, marginTop: spacing.xl },
});
