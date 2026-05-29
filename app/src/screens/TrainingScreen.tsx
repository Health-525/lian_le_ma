/**
 * 训练页：开启摄像头进行动作纠错（需求 4）。
 *
 * - 首次进入请求摄像头权限；拒绝则降级为"手动模式"（无预览，仅手动触发分析）。
 * - "分析当前动作"调用 getFormProvider().analyze()：现在是本地桩，模型接口就绪后
 *   切换到 HttpFormProvider，本页无需改动。
 * - 不标准且 conclusive 时展示纠正反馈；inconclusive 时提示重新采集。
 * - 每次分析结果记入 store，供训练报告确定性统计。
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

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
    // 仅在挂载与权限对象变化时尝试。
  }, [permission?.granted]);

  const onAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await getFormProvider().analyze({
        exercise: CURRENT_EXERCISE,
        frameCount: 30, // demo：假设已采集足够帧
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
    <View style={styles.container}>
      <Text style={styles.h1}>训练中 · {EXERCISE_LABEL[CURRENT_EXERCISE]}</Text>

      <View style={styles.cameraBox}>
        {cameraReady ? (
          <CameraView style={styles.camera} facing="front" />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackText}>
              {permission?.canAskAgain === false
                ? "摄像头未授权：已切换到手动模式（无画面预览）。\n可在系统设置中开启摄像头权限。"
                : "正在请求摄像头权限…"}
            </Text>
            {permission?.canAskAgain !== false && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={requestPermission}
              >
                <Text style={styles.secondaryBtnText}>允许使用摄像头</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
          {last.status === "inconclusive" ? (
            <Text style={styles.feedbackText}>
              未能判定，请调整站位让全身入镜后重试。
            </Text>
          ) : last.isStandard ? (
            <Text style={styles.feedbackText}>动作标准，保持节奏！💪</Text>
          ) : (
            <Text style={styles.feedbackText}>
              ⚠️ {last.correctionText ?? "动作需要纠正。"}
            </Text>
          )}
        </View>
      )}

      <Text style={styles.counter}>已分析 {analyses.length} 次</Text>

      <TouchableOpacity
        style={[styles.primaryBtn, analyzing && styles.btnDisabled]}
        onPress={onAnalyze}
        disabled={analyzing}
      >
        <Text style={styles.primaryBtnText}>
          {analyzing ? "分析中…" : "分析当前动作"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.finishBtn} onPress={onFinish}>
        <Text style={styles.finishBtnText}>结束训练并生成报告</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>反馈仅供参考，不构成医疗建议。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  cameraBox: {
    height: 360,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  cameraFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#1f2937",
  },
  fallbackText: { color: "#e5e7eb", textAlign: "center", lineHeight: 20 },
  feedback: { marginTop: 16, padding: 14, borderRadius: 12 },
  feedbackGood: { backgroundColor: "#dcfce7" },
  feedbackBad: { backgroundColor: "#fee2e2" },
  feedbackNeutral: { backgroundColor: "#f3f4f6" },
  feedbackText: { fontSize: 15, color: "#111" },
  counter: { marginTop: 14, color: "#666" },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#374151",
  },
  secondaryBtnText: { color: "#fff" },
  finishBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  finishBtnText: { color: "#16a34a", fontSize: 16, fontWeight: "700" },
  disclaimer: { marginTop: 14, color: "#9ca3af", fontSize: 12, textAlign: "center" },
});
