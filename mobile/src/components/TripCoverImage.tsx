import { Image, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors, radius } from "../theme";

export function TripCoverImage({
  uri,
  style,
}: {
  uri: string | null;
  style?: { width?: number | `${number}%`; height: number; borderRadius?: number };
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
      <Feather name="briefcase" size={26} color={colors.forest} style={{ opacity: 0.55 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: radius.card, backgroundColor: colors.sage },
  placeholder: {
    borderRadius: radius.card,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
  },
});
