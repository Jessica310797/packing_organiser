import { StyleSheet } from "react-native";

// Airbnb-inspired design language: soft neutral background, white cards
// separated by shadow rather than hard borders, generous rounded corners,
// a warm coral accent, clear (bold headline / muted secondary) type hierarchy.
export const colors = {
  bg: "#F7F7F7",
  card: "#FFFFFF",
  ink: "#222222",
  muted: "#717171",
  mutedLight: "#B0B0B0",
  accent: "#FF385C",
  accentSoft: "#FFE8EC",
  border: "#EBEBEB",
  warnBg: "#FFF6E8",
  warnInk: "#A15C00",
  danger: "#C13515",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

/** Soft card elevation -- Airbnb separates surfaces with shadow, not borders. */
export const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
};

export const textStyles = StyleSheet.create({
  screenTitle: { fontSize: 24, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, letterSpacing: -0.2 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  body: { fontSize: 15, color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 },
});

export const cardStyle = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...cardShadow,
  },
});

export const formStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 15,
    color: colors.ink,
  },
  field: { marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonLabel: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
  buttonSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonSecondaryLabel: { color: colors.ink, fontWeight: "600", fontSize: 13 },
});

/** Toggle-able chip used for multi-select (activities) and similar pickers. */
export const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: { fontSize: 13.5, fontWeight: "500", color: colors.ink },
  chipLabelSelected: { color: colors.accent, fontWeight: "700" },
});
