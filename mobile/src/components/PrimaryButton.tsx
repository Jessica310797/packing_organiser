import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { formStyles } from "../theme";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
}) {
  return (
    <Pressable
      style={[formStyles.button, (disabled || loading) && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon && <Feather name={icon} size={16} color="#fff" />}
          <Text style={formStyles.buttonLabel}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
