import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import AssessmentScreen from "./src/screens/AssessmentScreen";
import PlanScreen from "./src/screens/PlanScreen";
import TrainingScreen from "./src/screens/TrainingScreen";
import ReportScreen from "./src/screens/ReportScreen";
import type { RootStackParamList } from "./src/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 应用入口与导航栈：Assessment → Plan → Training → Report。
 * demo 数据流走本地 mock（无需后端即可在 Expo Go 扫码运行）；
 * 动作分析经可替换 Provider，模型接口就绪后切换即可。
 */
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Assessment">
        <Stack.Screen
          name="Assessment"
          component={AssessmentScreen}
          options={{ title: "练了吗 · 评估" }}
        />
        <Stack.Screen
          name="Plan"
          component={PlanScreen}
          options={{ title: "训练计划" }}
        />
        <Stack.Screen
          name="Training"
          component={TrainingScreen}
          options={{ title: "训练" }}
        />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: "训练报告" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
