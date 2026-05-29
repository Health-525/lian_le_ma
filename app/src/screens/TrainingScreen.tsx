/**
 * 训练页：开启摄像头进行动作纠错（需求 4）。
 */
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LogoMark, PillBadge, TechLabel, aura } from "../ui/aura";
import { getFormProvider, type FormAnalysisResult } from "../analysis";
import { useAppStore } from "../store/useAppStore";
import type { SupportedExercise } from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Training">;

// demo 默认演示动作；真实场景应由当天计划的当前动作驱动。
const CURRENT_EXERCISE: SupportedExercise = "squat";
const EXERCISE_LABEL: Record<SupportedExercise, string> = {
  squat: "深蹲",
  lunge: "弓步蹲",
  overhead_press: "推举",
  push_up: "俯卧撑",
};

export default function TrainingScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const startSession = useAppStore((s) => s.startSession);
  const recordAnalysis = useAppStore((s) => s.recordAnalysis);
  const analyses = useAppStore((s) => s.analyses);

  const [last, setLast] = useState<FormAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    startSession();
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted]);

  const onAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await getFormProvider().analyze({
        exercise: CURRENT_EXERCISE,
        frameCount: 30,
      });
      setLast(result);
      recordAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  };

  const onFinish = () => {
    useAppStore.getState().finishSession();
    navigation.navigate("Report");
  };

  const cameraReady = permission?.granted === true;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LogoMark size={32} inverted />
          <View style={styles.headerCopy}>
            <TechLabel light>LIVE_FORM_ANALYSIS</TechLabel>
            <Text style={styles.h1}>训练中 · {EXERCISE_LABEL[CURRENT_EXERCISE]}</Text>
            <Text style={styles.subtitle}>
              前置摄像头会在本地 demo provider 中生成动作反馈。
            </Text>
          </View>
          <PillBadge light>LIVE</PillBadge>
        </View>

        <View style={styles.cameraShell}>
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraLabel}>MOTION CAPTURE</Text>
            <Text style={styles.cameraCounter}>{analyses.length} scans</Text>
          </View>
          <View style={styles.cameraBox}>
            {cameraReady ? (
              <CameraView style={styles.camera} facing="front" />
            ) : (
              <View style={styles.cameraFallback}>
                <LogoMark size={34} inverted />
                <Text style={styles.fallbackText}>
                  {permission?.canAskAgain === false
                    ? "摄像头未授权，已切换到手动模式。可在系统设置中开启权限。"
                    : "正在请求摄像头权限。"}
                </Text>
                {permission?.canAskAgain !== false && (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={styles.secondaryBtn}
                    onPress={requestPermission}
                  >
                    <Text style={styles.secondaryBtnText}>允许使用摄像头</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {last && (
          <View
            style={[
              styles.feedback,
              last.status === "inconclusive"
                ? styles.feedbackNeutral
                : last.isStandard
                  ? styles.feedbackGood
                  : styles.feedbackBad,
            ]}
          >
            <TechLabel>
              {last.status === "inconclusive"
                ? "LOW_CONFIDENCE"
                : last.isStandard
                  ? "STANDARD"
                  : "CORRECTION"}
            </TechLabel>
            {last.status === "inconclusive" ? (
              <Text style={styles.feedbackText}>
                未能判定，请调整站位让全身入镜后重试。
              </Text>
            ) : last.isStandard ? (
              <Text style={styles.feedbackText}>动作标准，保持当前节奏。</Text>
            ) : (
              <Text style={styles.feedbackText}>
                {last.correctionText ?? "动作需要纠正。"}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.lightBtn, analyzing && styles.btnDisabled]}
          onPress={onAnalyze}
          disabled={analyzing}
        >
          <Text style={styles.lightBtnText}>
            {analyzing ? "分析中" : "分析当前动作"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.outlineBtn}
          onPress={onFinish}
        >
          <Text style={styles.outlineBtnText}>结束训练并生成报告</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>反馈仅供参考，不构成医疗建议。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    padding: 16,
    paddingBottom: 34,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
  },
  h1: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 8,
  },
  subtitle: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  cameraShell: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: aura.radius.lg,
    borderWidth: 1,
    padding: 10,
  },
  cameraHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  cameraLabel: {
    color: "rgba(255, 255, 255, 0.56)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  cameraCounter: {
    color: "rgba(255, 255, 255, 0.42)",
    fontFamily: aura.font.mono,
    fontSize: 10,
  },
  cameraBox: {
    backgroundColor: "#050608",
    aspectRatio: 1,
    borderRadius: 26,
    maxHeight: 340,
    minHeight: 280,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  cameraFallback: {
    alignItems: "center",
    backgroundColor: "#050608",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  fallbackText: {
    color: "rgba(255, 255, 255, 0.68)",
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 18,
    textAlign: "center",
  },
  feedback: {
    backgroundColor: aura.colors.surfaceSoft,
    borderRadius: aura.radius.md,
    marginTop: 14,
    padding: 16,
  },
  feedbackGood: {
    shadowColor: "#16a34a",
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  feedbackBad: {
    shadowColor: "#ba1a1a",
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  feedbackNeutral: {
    shadowColor: aura.colors.blueSoft,
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
  feedbackText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 10,
  },
  lightBtn: {
    alignItems: "center",
    backgroundColor: aura.colors.surface,
    borderRadius: aura.radius.pill,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 52,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.58,
  },
  lightBtnText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: aura.radius.pill,
    marginTop: 16,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryBtnText: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "800",
  },
  outlineBtn: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
  },
  outlineBtnText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
  },
  disclaimer: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
});
