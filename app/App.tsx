import type { ReactNode } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import {
  NavigationContainer,
  getFocusedRouteNameFromRoute,
  type RouteProp,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type {
  CustomizationStackParamList,
  ProfileStackParamList,
  RootTabParamList,
  WorkoutStackParamList,
} from "./src/navigation";
import PickScreen from "./src/screens/PickScreen";
import TrainingScreen from "./src/screens/TrainingScreen";
import WorkoutReportScreen from "./src/screens/WorkoutReportScreen";
import CustomizationScreen from "./src/screens/CustomizationScreen";
import PlanResultScreen from "./src/screens/PlanResultScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import VoiceScreen from "./src/screens/VoiceScreen";
import { SettingsProvider } from "./src/store/settings";
import { colors, font, spacing } from "./src/ui/theme";

const Tab = createBottomTabNavigator<RootTabParamList>();
const WorkoutStack = createNativeStackNavigator<WorkoutStackParamList>();
const CustomStack = createNativeStackNavigator<CustomizationStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function WorkoutNavigator() {
  return (
    <WorkoutStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkoutStack.Screen name="Pick" component={PickScreen} />
      <WorkoutStack.Screen name="Training" component={TrainingScreen} />
      <WorkoutStack.Screen name="WorkoutReport" component={WorkoutReportScreen} />
    </WorkoutStack.Navigator>
  );
}

function CustomizationNavigator() {
  return (
    <CustomStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <CustomStack.Screen
        name="CustomForm"
        component={CustomizationScreen}
        options={{ title: "个性定制" }}
      />
      <CustomStack.Screen
        name="PlanResult"
        component={PlanResultScreen}
        options={{ title: "7 天方案" }}
      />
    </CustomStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "个人资料" }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "通用设置" }}
      />
      <ProfileStack.Screen
        name="Voice"
        component={VoiceScreen}
        options={{ title: "语音教练" }}
      />
    </ProfileStack.Navigator>
  );
}

function workoutTabBarStyle(route: RouteProp<RootTabParamList, "Workout">) {
  const name = getFocusedRouteNameFromRoute(route) ?? "Pick";
  if (name === "Training") return { display: "none" as const };
  return undefined;
}

const PHONE_WIDTH = 420;
const PHONE_HEIGHT = 880;

function PhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  const viewportHeight = Dimensions.get("window").height;
  const height = Math.min(PHONE_HEIGHT, viewportHeight);
  return (
    <View style={styles.webBackdrop}>
      <View style={[styles.phone, { width: PHONE_WIDTH, height }]}>{children}</View>
    </View>
  );
}

export default function App() {
  return (
    <PhoneFrame>
      <SafeAreaProvider>
        <SettingsProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.accentDeep,
                tabBarInactiveTintColor: colors.textFaint,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: { fontSize: font.body, fontWeight: "700" },
                tabBarIconStyle: { display: "none" },
              }}
            >
              <Tab.Screen
                name="Workout"
                component={WorkoutNavigator}
                options={({ route }) => ({
                  title: "运动",
                  tabBarStyle: [styles.tabBar, workoutTabBarStyle(route)],
                })}
              />
              <Tab.Screen
                name="Customization"
                component={CustomizationNavigator}
                options={{ title: "个性定制" }}
              />
              <Tab.Screen
                name="Profile"
                component={ProfileNavigator}
                options={{ title: "我的" }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </SettingsProvider>
      </SafeAreaProvider>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    height: 62,
    paddingBottom: spacing(2),
    paddingTop: spacing(2.5),
  },
  webBackdrop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#E9ECF1",
    alignItems: "center",
    justifyContent: "center",
  },
  phone: {
    backgroundColor: colors.bg,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 24px 80px rgba(0,0,0,0.25)" } as object)
      : {}),
  },
});
