import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PackStackParamList } from "./types";
import PackScreen from "../screens/PackScreen";
import PackingListDetailScreen from "../screens/PackingListDetailScreen";
import { colors, fonts } from "../theme";

const Stack = createNativeStackNavigator<PackStackParamList>();

export function PackStack() {
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
      <Stack.Screen name="PackHome" component={PackScreen} options={{ title: "Pack" }} />
      <Stack.Screen
        name="PackingListDetail"
        component={PackingListDetailScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
    </Stack.Navigator>
  );
}
