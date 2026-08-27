import { StyleSheet } from "react-native";

// Pakka design system -- exact palette/type/radius/shadow per spec. Calm,
// premium, warm-neutral; Forest green for buttons, Pakka Green reserved for
// selection/active/decorative accents, used sparingly. No pure white, no
// pure black, no emoji as interface icons.
export const colors = {
  bg: "#F8F6F1", // Warm Ivory -- main background, never pure white
  card: "#FFFDF8", // slightly off-white, per the spec's card background
  ink: "#20211F", // Deep Ink -- headings, major text, nav
  muted: "#6F716B", // Muted Ink -- descriptions, secondary/meta text
  mutedLight: "#B7B3A8",
  green: "#A8C97F", // Pakka Green -- sparing: active/selected states, small highlights
  forest: "#40513A", // dark buttons, strong contrast, icon backgrounds
  peach: "#E9BFA7", // very sparing decorative accent
  sage: "#E9EFDF", // pale green surface -- cta sections, subtle tinted backgrounds
  border: "#E3E0D8", // warm border -- cards, dividers, inputs
  danger: "#B3452E",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// Spec's radius system: small 8, inputs 10, cards 20, large cards 24, CTA
// sections 28. Buttons are specified per-component as height/2 (true pills),
// so `pill` stays a large constant rather than the "24" in the summary table.
export const radius = { sm: 8, input: 10, card: 20, cardLarge: 24, ctaSection: 28, pill: 999 };

// "Most cards should have either a very subtle shadow OR a border, not both
// heavily" -- these two are deliberately the only shadow levels; most
// surfaces should reach for a border (colors.border) instead of shadowDefault.
export const shadowDefault = {
  shadowColor: "#20211F",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 16,
  elevation: 1,
};

export const shadowElevated = {
  shadowColor: "#20211F",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.07,
  shadowRadius: 40,
  elevation: 6,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
};

// Sizes are scaled down from the spec's desktop numbers (56/32px etc) for a
// phone screen, keeping the same weights/letter-spacing/hierarchy.
export const textStyles = StyleSheet.create({
  wordmark: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.ink },
  eyebrow: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headline: { fontFamily: fonts.semiBold, fontSize: 32, color: colors.ink, lineHeight: 36, letterSpacing: -0.5 },
  screenTitle: { fontFamily: fonts.semiBold, fontSize: 22, color: colors.ink, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.ink, lineHeight: 23 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, lineHeight: 24 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink, letterSpacing: 0.2, marginBottom: 6 },
});

export const cardStyle = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
});

export const formStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  field: { marginBottom: spacing.lg },
  // Primary button: Forest bg, white text, true pill (height/2 radius).
  button: {
    backgroundColor: colors.forest,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonLabel: { color: "#fff", fontFamily: fonts.medium, fontSize: 15 },
  // Secondary: transparent, forest text, no border.
  buttonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonSecondaryLabel: { color: colors.forest, fontFamily: fonts.medium, fontSize: 14 },
});

/** Toggle-able chip used for multi-select (activities) and similar pickers. */
export const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  chipSelected: {
    borderColor: colors.green,
    backgroundColor: colors.sage,
  },
  chipLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink },
  chipLabelSelected: { color: colors.forest, fontFamily: fonts.semiBold },
});
