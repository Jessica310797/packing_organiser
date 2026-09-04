import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { TripsStackParamList } from "./types";
import HomeScreen from "../screens/HomeScreen";
import NewTripScreen from "../screens/NewTripScreen";
import TripDetailScreen from "../screens/TripDetailScreen";
import { colors, fonts } from "../theme";

const Stack = createNativeStackNavigator<TripsStackParamList>();

export function TripsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.ink, fontSize: 18 },
        headerTintColor: colors.green,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewTrip" component={NewTripScreen} options={{ title: "New Trip" }} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} />
    </Stack.Navigator>
  );
}
