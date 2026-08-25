import { ActivityIndicator, Pressable, Text } from "react-native";
import { formStyles } from "../theme";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[formStyles.button, (disabled || loading) && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonLabel}>{label}</Text>}
    </Pressable>
  );
}
