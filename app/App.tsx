import { useCallback, useState, type ReactNode } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, getFocusedRouteNameFromRoute, type RouteProp } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import PickScreen from "./src/screens/PickScreen";
import TrainingScreen from "./src/screens/TrainingScreen";
import VoiceScreen from "./src/screens/VoiceScreen";
import { colors, font, spacing } from "./src/ui/theme";
import { lightHaptic } from "./src/ui/haptics";
import type { FitnessStackParamList, RootTabParamList } from "./src/navigation";

const Tab = createBottomTabNavigator<RootTabParamList>();
const FitnessStack = createNativeStackNavigator<FitnessStackParamList>();

function FitnessNavigator() {
  return (
    <FitnessStack.Navigator screenOptions={{ headerShown: false }}>
      <FitnessStack.Screen name="Pick" component={PickScreen} />
      <FitnessStack.Screen name="Training" component={TrainingScreen} />
    </FitnessStack.Navigator>
  );
}

function fitnessTabBarStyle(route: RouteProp<RootTabParamList, "Fitness">) {
  const name = getFocusedRouteNameFromRoute(route) ?? "Pick";
  if (name === "Training") return { display: "none" as const };
  return undefined;
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
  );
}

const PHONE_WIDTH = 420;
const PHONE_HEIGHT = 880;

function PhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;
  const vh = Dimensions.get("window").height;
  const height = Math.min(PHONE_HEIGHT, vh);
  return (
    <View style={styles.webBackdrop}>
      <View style={[styles.phone, { width: PHONE_WIDTH, height }]}>{children}</View>
    </View>
  );
}

function EmptyScreen() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

export default function App() {
  const [voiceVisible, setVoiceVisible] = useState(false);

  const openVoice = useCallback(() => {
    lightHaptic();
    setVoiceVisible(true);
  }, []);

  const closeVoice = useCallback(() => {
    setVoiceVisible(false);
  }, []);

  return (
    <PhoneFrame>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.text,
              tabBarInactiveTintColor: colors.textFaint,
              tabBarStyle: styles.tabBar,
              tabBarLabelStyle: { fontSize: font.caption, fontWeight: "600" },
            }}
          >
            <Tab.Screen
              name="Fitness"
              component={FitnessNavigator}
              options={({ route }) => ({
                title: "健身",
                tabBarIcon: ({ focused }) => <TabIcon emoji="🏃" focused={focused} />,
                tabBarStyle: [styles.tabBar, fitnessTabBarStyle(route)],
              })}
            />
            <Tab.Screen
              name="Voice"
              component={EmptyScreen}
              listeners={{ tabPress: (e) => { e.preventDefault(); openVoice(); } }}
              options={{
                title: "音色",
                tabBarIcon: ({ focused }) => <TabIcon emoji="🎙️" focused={focused} />,
              }}
            />
          </Tab.Navigator>

          {voiceVisible && <VoiceScreen onClose={closeVoice} />}
        </NavigationContainer>
      </SafeAreaProvider>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: spacing(3),
    paddingTop: spacing(2),
  },
  webBackdrop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#050609",
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
      ? ({ boxShadow: "0 24px 80px rgba(0,0,0,0.6)" } as object)
      : {}),
  },
});
