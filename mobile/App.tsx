import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import type { RootTabParamList } from "./src/navigation/types";
import { TripsStack } from "./src/navigation/TripsStack";
import { PackStack } from "./src/navigation/PackStack";
import WardrobeScreen from "./src/screens/WardrobeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, (color: string) => React.ReactNode> = {
  TripsTab: (color) => <Ionicons name="briefcase-outline" size={22} color={color} />,
  WardrobeTab: (color) => <MaterialCommunityIcons name="hanger" size={22} color={color} />,
  PackTab: (color) => <Ionicons name="bag-handle-outline" size={22} color={color} />,
  ProfileTab: (color) => <Ionicons name="person-outline" size={22} color={color} />,
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  TripsTab: "Trips",
  WardrobeTab: "Wardrobe",
  PackTab: "Pack",
  ProfileTab: "Profile",
};

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.mutedLight,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarLabel: TAB_LABELS[route.name as keyof RootTabParamList],
          tabBarIcon: ({ color }) => TAB_ICONS[route.name as keyof RootTabParamList](color),
        })}
      >
        <Tab.Screen name="TripsTab" component={TripsStack} />
        <Tab.Screen name="WardrobeTab" component={WardrobeScreen} />
        <Tab.Screen name="PackTab" component={PackStack} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      </Tab.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
