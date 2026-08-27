import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import { getUserName, setUserName } from "../lib/profile";
import { colors, formStyles, radius, spacing, textStyles } from "../theme";

export default function ProfileScreen() {
  const [name, setName] = useState("");

  useFocusEffect(() => {
    getUserName().then((n) => setName(n ?? ""));
  });

  function handleChange(value: string) {
    setName(value);
    setUserName(value).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Feather name="user" size={28} color={colors.ink} />
      </View>
      <Text style={textStyles.title}>Profile</Text>

      <View style={styles.field}>
        <Text style={textStyles.label}>Your name</Text>
        <TextInput
          style={formStyles.input}
          value={name}
          onChangeText={handleChange}
          placeholder="e.g. Jess"
        />
      </View>
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
  field: { width: "100%", marginTop: spacing.lg },
});
