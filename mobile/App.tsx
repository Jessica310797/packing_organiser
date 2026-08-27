import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./src/navigation/types";
import TripsScreen from "./src/screens/TripsScreen";
import NewTripScreen from "./src/screens/NewTripScreen";
import TripDetailScreen from "./src/screens/TripDetailScreen";
import { colors } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "700", color: colors.ink },
          headerTintColor: colors.accent,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Trips" component={TripsScreen} options={{ title: "🧳 Packing Organiser" }} />
        <Stack.Screen name="NewTrip" component={NewTripScreen} options={{ title: "New Trip" }} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
