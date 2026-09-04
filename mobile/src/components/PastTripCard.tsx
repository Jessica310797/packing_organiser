import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radius } from "../theme";

export function PastTripCard({
  destination,
  dateRange,
  imageUrl,
  onPress,
}: {
  destination: string;
  dateRange: string;
  imageUrl: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Feather name="image" size={18} color={colors.muted} style={{ opacity: 0.5 }} />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(23,24,23,0.75)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.textWrap}>
        <Text style={styles.destination} numberOfLines={1}>
          {destination}
        </Text>
        <Text style={styles.date}>{dateRange}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 110,
    height: 160,
    borderRadius: radius.pastCard,
    overflow: "hidden",
    backgroundColor: colors.beige,
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  textWrap: { position: "absolute", left: 12, bottom: 14, right: 12 },
  destination: { fontFamily: fonts.medium, fontSize: 15, color: "#FFFFFF" },
  date: { fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.9)", marginTop: 2 },
});
