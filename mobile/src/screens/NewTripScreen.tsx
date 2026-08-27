import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { TripsStackParamList } from "../navigation/types";
import { createTrip } from "../api/client";
import { formStyles, spacing, textStyles } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";
import { CityAutocomplete } from "../components/CityAutocomplete";
import { TripPurposeSelect } from "../components/TripPurposeSelect";
import { ActivitiesMultiSelect } from "../components/ActivitiesMultiSelect";
import { TripDateRangePicker } from "../components/TripDateRangePicker";

type Props = NativeStackScreenProps<TripsStackParamList, "NewTrip">;

export default function NewTripScreen({ navigation }: Props) {
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [packingTarget, setPackingTarget] = useState("");
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

    const parsedTarget = parseInt(packingTarget, 10);

    setSubmitting(true);
    try {
      const trip = await createTrip({
        destination: destination.trim(),
        purpose: purpose.trim(),
        startDate,
        endDate,
        durationDays,
        activities,
        packingTarget: Number.isInteger(parsedTarget) && parsedTarget > 0 ? parsedTarget : null,
      });
      navigation.replace("TripDetail", { tripId: trip.id, destination: trip.destination });
    } catch (err) {
      Alert.alert("Couldn't create trip", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
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

      <View style={formStyles.field}>
        <Text style={textStyles.label}>How many items are you packing? (optional)</Text>
        <TextInput
          style={formStyles.input}
          placeholder="e.g. 16"
          value={packingTarget}
          onChangeText={setPackingTarget}
          keyboardType="number-pad"
        />
      </View>

      <PrimaryButton label="Create trip" onPress={submit} loading={submitting} />
    </ScrollView>
  );
}
