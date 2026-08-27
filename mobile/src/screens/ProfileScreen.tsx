import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, textStyles } from "../theme";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 28 }}>🙂</Text>
      </View>
      <Text style={textStyles.title}>Profile</Text>
      <Text style={styles.body}>Account and settings will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.tan,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  body: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
