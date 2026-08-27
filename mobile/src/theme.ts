import { StyleSheet } from "react-native";

// Pakka design system v3 -- "luxury travel magazine x modern iOS app x
// minimalist personal organiser". Warm off-white background, near-black
// ink, muted olive as the sparing accent/progress colour, black for the
// primary CTA. Cormorant Garamond is the editorial display face (greeting,
// "Plan a trip", destination names); everything else is Inter. Cards float
// on a very subtle shadow rather than a border.
export const colors = {
  bg: "#FAF9F6", // warm off-white -- never pure white
  card: "#FFFFFF",
  ink: "#171817", // headings, logo, primary nav, black CTA
  muted: "#858582", // descriptions, dates, weather, metadata
  mutedLight: "#9A9A96", // unselected bottom-nav icons/labels
  green: "#657451", // muted olive -- progress fill, selected states, subtle accents
  paleGreen: "#E7E9DE", // high-progress badge background
  beige: "#E8E1D7", // suitcase icon circle, decorative surfaces
  beigeDark: "#806B4C", // text on the warm-beige (lower-progress) badge
  beigeBadge: "#EEE8DE", // lower-progress badge background
  progressBg: "#E8E7E2",
  border: "#ECEAE4",
  danger: "#B3452E",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = {
  sm: 8,
  input: 10,
  pastCard: 16,
  card: 20,
  cardLarge: 22, // plan-a-trip card, primary pill buttons
  navTop: 28, // bottom nav top corners
  pill: 999,
};

// "Very subtle shadow" per spec (0 8px 30px rgba(0,0,0,0.06)) -- cards float
// slightly above the background instead of using a visible border.
export const shadowCard = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 30,
  elevation: 3,
};

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  // Editorial display face -- greeting, "Plan a trip", destination names only.
  serif: "CormorantGaramond_500Medium",
  serifSemiBold: "CormorantGaramond_600SemiBold",
};

export const textStyles = StyleSheet.create({
  wordmark: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, letterSpacing: 3 },
  greeting: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, lineHeight: 32 },
  screenTitle: { fontFamily: fonts.semiBold, fontSize: 22, color: colors.ink, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  title: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.ink, lineHeight: 23 },
  cardTitleSerif: { fontFamily: fonts.serif, fontSize: 21, color: colors.ink, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.ink, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, lineHeight: 22 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink, letterSpacing: 0.2, marginBottom: 6 },
});

export const cardStyle = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadowCard,
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
  // Primary button: black CTA, white text, true pill.
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.cardLarge,
    paddingVertical: 15,
    alignItems: "center",
  },
  buttonLabel: { color: "#fff", fontFamily: fonts.medium, fontSize: 15 },
  // Secondary: transparent, ink text, no border.
  buttonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonSecondaryLabel: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
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
    backgroundColor: colors.paleGreen,
  },
  chipLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.ink },
  chipLabelSelected: { color: colors.green, fontFamily: fonts.semiBold },
});
