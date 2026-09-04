import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../navigation/AuthStack";
import { useAuth } from "../lib/authContext";
import { colors, formStyles, spacing, textStyles } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      Alert.alert("Couldn't sign in", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 100, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={textStyles.wordmark}>PAKKA</Text>
        <Text style={[textStyles.body, { marginTop: spacing.xs, marginBottom: spacing.xl }]}>
          Sign in to your trips.
        </Text>

        <View style={formStyles.field}>
          <Text style={textStyles.label}>Email</Text>
          <TextInput
            style={formStyles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
        </View>

        <View style={formStyles.field}>
          <Text style={textStyles.label}>Password</Text>
          <TextInput
            style={formStyles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        <PrimaryButton label="Sign in" onPress={submit} loading={submitting} />

        <Text
          style={{ color: colors.green, textAlign: "center", marginTop: spacing.lg, fontSize: 14 }}
          onPress={() => navigation.navigate("Signup")}
        >
          New here? Create an account
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
