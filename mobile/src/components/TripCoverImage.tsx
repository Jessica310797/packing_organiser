import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

export function TripCoverImage({
  uri,
  style,
}: {
  uri: string | null;
  style?: { width?: number; height: number; borderRadius?: number };
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={StyleSheet.flatten([styles.image, style])}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.icon}>🧳</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: radius.md, backgroundColor: colors.tan },
  placeholder: {
    borderRadius: radius.md,
    backgroundColor: colors.tan,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 28, opacity: 0.6 },
});
