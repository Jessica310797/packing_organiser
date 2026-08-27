import { StyleSheet } from "react-native";

// "Pakka" editorial design language: warm cream background, near-black ink
// for headlines/CTAs, a serif display face for headlines contrasted with
// system sans for body/UI text, soft semantic status pills, image-forward
// cards separated by subtle shadow.
export const colors = {
  bg: "#F6F3EC",
  card: "#FFFFFF",
  ink: "#1C1B19",
  muted: "#8A8579",
  mutedLight: "#B7B2A4",
  border: "#E9E3D6",
  accent: "#1C1B19", // primary CTA / selection color is ink-black, not a hue
  accentSoft: "#EFEAE0",
  tan: "#E7DFC9", // icon-circle / decorative fill
  progressGoodBg: "#DEE6D3",
  progressGoodInk: "#4B6B3D",
  progressLowBg: "#F2E3C9",
  progressLowInk: "#9C6B2E",
  warnBg: "#FFF6E8",
  warnInk: "#A15C00",
  danger: "#C13515",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const cardShadow = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

export const fonts = {
  serif: "PlayfairDisplay_700Bold",
  serifSemiBold: "PlayfairDisplay_600SemiBold",
  serifRegular: "PlayfairDisplay_400Regular",
};

export const textStyles = StyleSheet.create({
  wordmark: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, letterSpacing: 1 },
  screenTitle: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  greeting: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 19, color: colors.ink },
  cardTitle: { fontFamily: fonts.serifSemiBold, fontSize: 17, color: colors.ink },
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
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
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
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  chipLabel: { fontSize: 13.5, fontWeight: "500", color: colors.ink },
  chipLabelSelected: { color: "#fff", fontWeight: "700" },
});
