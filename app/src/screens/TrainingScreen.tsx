/**
 * 训练页：全屏摄像头 HUD + AI 教练提示，保留动作分析与报告生成流程。
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getFormProvider, type FormAnalysisResult } from "../analysis";
import { useAppStore } from "../store/useAppStore";
import type { SupportedExercise } from "../types";
import type { RootStackParamList } from "../navigation";
import { aura } from "../ui/aura";

type Props = NativeStackScreenProps<RootStackParamList, "Training">;

const CURRENT_EXERCISE: SupportedExercise = "squat";
const EXERCISE_LABEL: Record<SupportedExercise, string> = {
  squat: "深蹲",
  lunge: "弓步蹲",
  overhead_press: "推举",
  push_up: "俯卧撑",
};

function coachCopy(last: FormAnalysisResult | null): {
  label: string;
  text: string;
  tone: "warning" | "normal" | "good";
} {
  if (!last) {
    return {
      label: "动作纠正",
      text: "减少肘部外展。保持肘部内收约 45 度以保护肩部关节。",
      tone: "warning",
    };
  }
  if (last.status === "inconclusive") {
    return {
      label: "重新采集",
      text: "未能判定，请调整站位，让全身入镜后重新检测。",
      tone: "normal",
    };
  }
  if (last.isStandard) {
    return {
      label: "动作稳定",
      text: "动作标准，继续保持当前节奏和核心稳定性。",
      tone: "good",
    };
  }
  return {
    label: "动作纠正",
    text: last.correctionText ?? "动作需要纠正，请降低速度并重新完成一次。",
    tone: "warning",
  };
}

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
    if (!permission?.granted && permission?.canAskAgain !== false) {
      requestPermission();
      return;
    }

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
  const copy = coachCopy(last);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cameraStage}>
        {cameraReady ? (
          <CameraView style={styles.camera} facing="front" />
        ) : (
          <View style={styles.cameraFallback}>
            <Text style={styles.fallbackIcon}>◎</Text>
            <Text style={styles.fallbackTitle}>开启实时 AI 指导</Text>
            <Text style={styles.fallbackText}>
              需要摄像头权限以提供动作纠错。当前未授权时仍可使用手动检测演示。
            </Text>
            {permission?.canAskAgain !== false && (
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>开启权限</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.vignette} />

        <View style={styles.telemetry}>
          <View style={styles.telemetryLeft}>
            <Text style={styles.telemetryText}>SCAN_FPS: 60</Text>
            <Text style={styles.telemetryText}>TRACKING_ID: 8829-X</Text>
          </View>
          <Text style={styles.telemetryText}>BATTERY_FULL</Text>
        </View>

        <View style={styles.permissionChips}>
          <View style={styles.hudChip}>
            <View style={styles.greenDot} />
            <Text style={styles.hudChipText}>
              摄像头 {cameraReady ? "已开启" : "待授权"}
            </Text>
          </View>
          <View style={styles.hudChip}>
            <View style={styles.greenDot} />
            <Text style={styles.hudChipText}>麦克风 已开启</Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusIcon}>✦</Text>
          <Text style={styles.statusText}>动作检测</Text>
        </View>

        <View pointerEvents="none" style={styles.skeletonLayer}>
          <View style={[styles.skeletonLine, styles.shoulderLine]} />
          <View style={[styles.skeletonLine, styles.torsoLine]} />
          <View style={[styles.skeletonJoint, styles.leftJoint]} />
          <View style={[styles.skeletonJoint, styles.rightJoint]} />
          <View style={[styles.skeletonJoint, styles.centerJoint]} />
          <View style={[styles.errorJoint, styles.warningJoint]} />
          <Text style={styles.confidenceText}>CONF: 94%</Text>
          <View style={styles.guideLine} />
        </View>

        <View style={styles.stabilityPanel}>
          <Text style={styles.stabilityLabel}>稳定性</Text>
          <View style={styles.meterTrack}>
            <View style={styles.meterFill} />
          </View>
          <Text style={styles.stabilityValue}>82%</Text>
        </View>

        <View style={styles.statsOverlay}>
          <View style={styles.statGlass}>
            <Text style={styles.statLabel}>次数</Text>
            <Text style={styles.statValue}>
              {String(Math.max(8, analyses.length)).padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.statGlass}>
            <Text style={styles.statLabel}>重量</Text>
            <View style={styles.weightRow}>
              <Text style={styles.statValue}>100</Text>
              <Text style={styles.statUnit}>kg</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.startButton, analyzing && styles.buttonDisabled]}
          onPress={onAnalyze}
          disabled={analyzing}
        >
          <Text style={styles.startIcon}>▶</Text>
          <Text style={styles.startButtonText}>
            {analyzing
              ? "分析中"
              : analyses.length === 0
                ? "开始训练"
                : "再次检测"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.coachPanel}>
        <View style={styles.dragHandle} />
        <View style={styles.coachHeader}>
          <Text style={styles.coachIcon}>思</Text>
          <Text style={styles.coachTitle}>AI 教练</Text>
          <Text style={styles.exerciseLabel}>{EXERCISE_LABEL[CURRENT_EXERCISE]}</Text>
        </View>

        <View
          style={[
            styles.tipCard,
            copy.tone === "warning" && styles.tipWarning,
            copy.tone === "good" && styles.tipGood,
          ]}
        >
          <View
            style={[
              styles.tipIcon,
              copy.tone === "warning" && styles.tipIconWarning,
              copy.tone === "good" && styles.tipIconGood,
            ]}
          >
            <Text style={styles.tipIconText}>灯</Text>
          </View>
          <View style={styles.tipCopy}>
            <Text
              style={[
                styles.tipLabel,
                copy.tone === "warning" && styles.tipLabelWarning,
                copy.tone === "good" && styles.tipLabelGood,
              ]}
            >
              {copy.label}
            </Text>
            <Text style={styles.tipText}>{copy.text}</Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Text style={styles.tipIconText}>调</Text>
          </View>
          <View style={styles.tipCopy}>
            <Text style={styles.tipLabel}>训练节奏</Text>
            <Text style={styles.tipText}>
              减慢下落速度。离心阶段保持约 3 秒以获得更好的肌肉控制。
            </Text>
          </View>
        </View>

        <View style={styles.coachFooter}>
          <Text style={styles.footerStatus}>✓ 核心稳定性: 88% | 动作一致性: 优秀</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.finishButton}
          onPress={onFinish}
        >
          <Text style={styles.finishButtonText}>结束训练并生成报告</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#050608",
  },
  cameraStage: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "#111318",
    justifyContent: "center",
    padding: 26,
  },
  fallbackIcon: {
    color: "rgba(255, 255, 255, 0.86)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 46,
  },
  fallbackTitle: {
    color: "#ffffff",
    fontFamily: aura.font.uiHeavy,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
  },
  fallbackText: {
    color: "rgba(255, 255, 255, 0.64)",
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 310,
    textAlign: "center",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 46,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "900",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  telemetry: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 20,
    opacity: 0.5,
    position: "absolute",
    right: 20,
    top: 8,
  },
  telemetryLeft: {
    flexDirection: "row",
    gap: 14,
  },
  telemetryText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontFamily: aura.font.mono,
    fontSize: 8,
    letterSpacing: 1.1,
  },
  permissionChips: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 42,
  },
  hudChip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  greenDot: {
    backgroundColor: "#4ade80",
    borderRadius: 6,
    height: 6,
    width: 6,
  },
  hudChipText: {
    color: "rgba(255, 255, 255, 0.84)",
    fontFamily: aura.font.mono,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    position: "absolute",
    top: 82,
  },
  statusIcon: {
    color: "#fdba74",
    fontSize: 14,
  },
  statusText: {
    color: "rgba(255, 255, 255, 0.92)",
    fontFamily: aura.font.mono,
    fontSize: 11,
    letterSpacing: 1.3,
  },
  skeletonLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonLine: {
    backgroundColor: "rgba(139, 163, 204, 0.5)",
    borderRadius: 999,
    height: 6,
    position: "absolute",
    shadowColor: aura.colors.blueSoft,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  shoulderLine: {
    left: "28%",
    top: "43%",
    transform: [{ rotate: "-8deg" }],
    width: "38%",
  },
  torsoLine: {
    height: 5,
    left: "48%",
    top: "46%",
    transform: [{ rotate: "90deg" }],
    width: "24%",
  },
  skeletonJoint: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 12,
    height: 18,
    position: "absolute",
    shadowColor: "#ffffff",
    shadowOpacity: 0.8,
    shadowRadius: 10,
    width: 18,
  },
  leftJoint: {
    left: "29%",
    top: "42%",
  },
  rightJoint: {
    right: "31%",
    top: "42%",
  },
  centerJoint: {
    left: "48%",
    top: "40%",
  },
  errorJoint: {
    backgroundColor: "rgba(255, 160, 122, 0.82)",
    borderRadius: 18,
    height: 34,
    position: "absolute",
    shadowColor: "#ffa07a",
    shadowOpacity: 0.9,
    shadowRadius: 16,
    width: 34,
  },
  warningJoint: {
    left: "39%",
    top: "40%",
  },
  confidenceText: {
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: aura.font.mono,
    fontSize: 9,
    left: "51%",
    position: "absolute",
    top: "39%",
  },
  guideLine: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    height: 1,
    left: "25%",
    position: "absolute",
    right: "25%",
    top: "45%",
  },
  stabilityPanel: {
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: 20,
    top: "34%",
  },
  stabilityLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  meterTrack: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    height: 150,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 8,
  },
  meterFill: {
    backgroundColor: aura.colors.blueSoft,
    borderRadius: aura.radius.pill,
    height: "82%",
    shadowColor: aura.colors.blueSoft,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  stabilityValue: {
    color: "rgba(255, 255, 255, 0.92)",
    fontFamily: aura.font.mono,
    fontSize: 11,
  },
  statsOverlay: {
    bottom: 186,
    flexDirection: "row",
    gap: 8,
    left: 16,
    position: "absolute",
  },
  statGlass: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.62)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  statValue: {
    color: "#ffffff",
    fontFamily: aura.font.uiHeavy,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 4,
  },
  weightRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 3,
  },
  statUnit: {
    color: "rgba(255, 255, 255, 0.55)",
    fontFamily: aura.font.mono,
    fontSize: 10,
  },
  startButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(255, 255, 255, 0.32)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    bottom: 184,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 28,
    position: "absolute",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
  },
  startIcon: {
    color: aura.colors.ink,
    fontSize: 19,
  },
  startButtonText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.62,
  },
  coachPanel: {
    backgroundColor: "rgba(20, 20, 25, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    maxHeight: "46%",
    minHeight: 330,
    padding: 20,
    paddingTop: 14,
    position: "absolute",
    right: 0,
  },
  dragHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 999,
    height: 4,
    marginBottom: 16,
    width: 40,
  },
  coachHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: 12,
  },
  coachIcon: {
    color: aura.colors.blueSoft,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
  },
  coachTitle: {
    color: "#ffffff",
    flex: 1,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
    fontWeight: "900",
  },
  exerciseLabel: {
    color: "rgba(255, 255, 255, 0.48)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  tipCard: {
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginTop: 10,
    padding: 14,
  },
  tipWarning: {
    backgroundColor: "rgba(249, 115, 22, 0.12)",
    borderColor: "rgba(249, 115, 22, 0.25)",
  },
  tipGood: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  tipIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: aura.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  tipIconWarning: {
    backgroundColor: "rgba(251, 146, 60, 0.2)",
  },
  tipIconGood: {
    backgroundColor: "rgba(74, 222, 128, 0.18)",
  },
  tipIconText: {
    color: aura.colors.blueSoft,
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
  },
  tipCopy: {
    flex: 1,
  },
  tipLabel: {
    color: aura.colors.blueSoft,
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  tipLabelWarning: {
    color: "#fed7aa",
  },
  tipLabelGood: {
    color: "#bbf7d0",
  },
  tipText: {
    color: "rgba(255, 255, 255, 0.76)",
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 21,
  },
  coachFooter: {
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  footerStatus: {
    color: "rgba(255, 255, 255, 0.48)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  finishButton: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
  },
  finishButtonText: {
    color: "rgba(255, 255, 255, 0.82)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "800",
  },
});
