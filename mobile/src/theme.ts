import { StyleSheet } from "react-native";

export const colors = {
  bg: "#f7f5f2",
  card: "#ffffff",
  ink: "#1f2320",
  muted: "#6b6f6c",
  accent: "#1f6f5c",
  accentSoft: "#eef6f2",
  border: "#e4e0da",
  warnBg: "#fff4e0",
  warnInk: "#8a5a00",
  danger: "#b3402f",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const textStyles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4 },
});

export const formStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    fontSize: 15,
    color: colors.ink,
  },
  field: { marginBottom: spacing.md },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonSecondary: {
    backgroundColor: "#f1f1ef",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  buttonSecondaryLabel: { color: colors.ink, fontWeight: "600", fontSize: 13 },
});
