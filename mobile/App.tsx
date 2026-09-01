import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from "@expo-google-fonts/cormorant-garamond";
import type { RootTabParamList } from "./src/navigation/types";
import { TripsStack } from "./src/navigation/TripsStack";
import { PackStack } from "./src/navigation/PackStack";
import { AuthStack } from "./src/navigation/AuthStack";
import WardrobeScreen from "./src/screens/WardrobeScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import { colors, fonts } from "./src/theme";
import { AuthProvider, useAuth } from "./src/lib/authContext";

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, (color: string) => React.ReactNode> = {
  TripsTab: (color) => <Feather name="briefcase" size={21} color={color} />,
  WardrobeTab: (color) => <MaterialCommunityIcons name="hanger" size={22} color={color} />,
  PackTab: (color) => <Feather name="shopping-bag" size={21} color={color} />,
  ProfileTab: (color) => <Feather name="user" size={21} color={color} />,
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  TripsTab: "Trips",
  WardrobeTab: "Wardrobe",
  PackTab: "Pack",
  ProfileTab: "Profile",
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          height: 92,
          paddingTop: 14,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 20,
          elevation: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 13, marginTop: 6 },
        tabBarLabel: TAB_LABELS[route.name as keyof RootTabParamList],
        tabBarIcon: ({ color }) => TAB_ICONS[route.name as keyof RootTabParamList](color),
      })}
    >
      <Tab.Screen name="TripsTab" component={TripsStack} />
      <Tab.Screen name="WardrobeTab" component={WardrobeScreen} />
      <Tab.Screen name="PackTab" component={PackStack} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === "signedIn" ? <MainTabs /> : <AuthStack />}
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
