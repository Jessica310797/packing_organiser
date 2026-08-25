import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { createTrip } from "../api/client";
import { formStyles, spacing, textStyles } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "NewTrip">;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewTripScreen({ navigation }: Props) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activities, setActivities] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!destination.trim() || !DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      Alert.alert("Missing info", "Please fill in a destination and both dates as YYYY-MM-DD.");
      return;
    }
    const durationDays = Math.max(
      1,
      Math.round((+new Date(endDate) - +new Date(startDate)) / 86_400_000) + 1,
    );

    setSubmitting(true);
    try {
      const trip = await createTrip({
        destination: destination.trim(),
        startDate,
        endDate,
        durationDays,
        activities: activities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      navigation.replace("TripDetail", { tripId: trip.id, destination: trip.destination });
    } catch (err) {
      Alert.alert("Couldn't create trip", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <View style={formStyles.field}>
        <Text style={textStyles.label}>Destination</Text>
        <TextInput
          style={formStyles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Lisbon, Portugal"
        />
      </View>
      <View style={formStyles.field}>
        <Text style={textStyles.label}>Start date (YYYY-MM-DD)</Text>
        <TextInput
          style={formStyles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-09-10"
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <View style={formStyles.field}>
        <Text style={textStyles.label}>End date (YYYY-MM-DD)</Text>
        <TextInput
          style={formStyles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-09-15"
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <View style={formStyles.field}>
        <Text style={textStyles.label}>Activities / occasion</Text>
        <TextInput
          style={formStyles.input}
          value={activities}
          onChangeText={setActivities}
          placeholder="beach, hiking, wedding"
        />
      </View>
      <PrimaryButton label="Create trip" onPress={submit} loading={submitting} />
    </ScrollView>
  );
}
