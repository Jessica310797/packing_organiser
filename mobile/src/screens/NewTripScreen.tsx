import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { createTrip } from "../api/client";
import { formStyles, spacing, textStyles } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";
import { CityAutocomplete } from "../components/CityAutocomplete";
import { TripPurposeSelect } from "../components/TripPurposeSelect";
import { ActivitiesMultiSelect } from "../components/ActivitiesMultiSelect";
import { TripDateRangePicker } from "../components/TripDateRangePicker";

type Props = NativeStackScreenProps<RootStackParamList, "NewTrip">;

export default function NewTripScreen({ navigation }: Props) {
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!destination.trim() || !purpose.trim() || !startDate || !endDate) {
      Alert.alert("Missing info", "Please fill in a destination, trip purpose, and trip dates.");
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
        purpose: purpose.trim(),
        startDate,
        endDate,
        durationDays,
        activities,
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
        <CityAutocomplete value={destination} onChangeText={setDestination} placeholder="Lisbon, Portugal" />
      </View>

      <View style={formStyles.field}>
        <Text style={textStyles.label}>Trip Purpose</Text>
        <TripPurposeSelect value={purpose} onChange={setPurpose} />
      </View>

      <View style={formStyles.field}>
        <Text style={textStyles.label}>Activities</Text>
        <ActivitiesMultiSelect value={activities} onChange={setActivities} />
      </View>

      <View style={formStyles.field}>
        <Text style={textStyles.label}>Trip Dates</Text>
        <TripDateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }} />
      </View>

      <PrimaryButton label="Create trip" onPress={submit} loading={submitting} />
    </ScrollView>
  );
}
