import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/authContext";
import { colors, formStyles, spacing, textStyles } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter your email and a password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim() || null);
    } catch (err) {
      Alert.alert("Couldn't create account", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={formStyles.field}>
          <Text style={textStyles.label}>Name (optional)</Text>
          <TextInput style={formStyles.input} value={name} onChangeText={setName} placeholder="e.g. Jess" />
        </View>

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
            placeholder="At least 8 characters"
          />
        </View>

        <PrimaryButton label="Create account" onPress={submit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
