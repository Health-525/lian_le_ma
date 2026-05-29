/**
 * 实时姿势矫正页（第二步）—— iOS 全屏摄像头 + 毛玻璃叠加层。
 *
 * 叠加层：
 *  - 顶部：返回 / 状态徽章 / 翻转（BlurView）
 *  - 中部：大号次数 96px + 动作阶段
 *  - 底部：毛玻璃提示卡 + 暂停/结束控制
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  getFormProvider,
  isModelConnected,
  stopFormSession,
  type FormAnalysisResult,
} from "../analysis";
import { PrimaryButton, GlassCard } from "../ui/components";
import { colors, elevation, font, radius, spacing, toneOf, type StatusTone } from "../ui/theme";
import { springBouncy } from "../ui/animation";
import { heavyHaptic, lightHaptic } from "../ui/haptics";
import { EXERCISE_LABEL } from "../types";
import type { FitnessStackParamList } from "../navigation";

type Props = NativeStackScreenProps<FitnessStackParamList, "Training">;

const FRAME_INTERVAL_MS = 600;

const PHASE_LABEL: Record<string, string> = {
  up: "上升",
  down: "下降",
  ready: "准备",
  hold: "保持",
  lowering: "下放",
  rising: "上举",
};

export default function TrainingScreen({ navigation, route }: Props) {
  const { exercise } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>("front");
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<FormAnalysisResult | null>(null);
  const [reps, setReps] = useState(0);
  const [statusMsg, setStatusMsg] = useState("正在准备摄像头…");

  const busyRef = useRef(false);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 次数弹跳动画
  const repScale = useSharedValue(1);
  const prevReps = useRef(0);

  useEffect(() => {
    if (reps !== prevReps.current && prevReps.current !== 0) {
      repScale.value = 1.3;
      repScale.value = withSpring(1, springBouncy);
    }
    prevReps.current = reps;
  }, [reps, repScale]);

  const repAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: repScale.value }],
  }));

  const connected = isModelConnected();

  const sendFrame = useCallback(async () => {
    if (busyRef.current || !runningRef.current) return;
    if (!cameraRef.current || !permission?.granted) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
        base64: true,
      });
      const result = await getFormProvider().analyze({
        exercise,
        imageBase64: photo?.base64,
        frameCount: 30,
      });
      setLast(result);
      if (typeof result.repCount === "number") setReps(result.repCount);
    } catch {
      setStatusMsg("帧分析失败，请检查模型服务连接");
    } finally {
      busyRef.current = false;
    }
  }, [exercise, permission?.granted]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setStatusMsg(connected ? "训练中 · 已接入模型" : "训练中 · 演示模式");
    sendFrame();
    timerRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS);
  }, [sendFrame, connected]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permission?.granted && !runningRef.current) startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  useEffect(() => {
    return () => {
      stopLoop();
      void stopFormSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBack = () => {
    lightHaptic();
    stopLoop();
    void stopFormSession();
    navigation.goBack();
  };

  const togglePause = () => {
    heavyHaptic();
    if (runningRef.current) {
      stopLoop();
      setStatusMsg("已暂停 · 点击继续");
    } else {
      startLoop();
    }
  };

  const onEnd = () => {
    heavyHaptic();
    stopLoop();
    void stopFormSession();
    navigation.goBack();
  };

  const cameraReady = permission?.granted === true;
  const tone: StatusTone = (last?.statusColor as StatusTone) ?? "idle";
  const palette = toneOf(tone);
  const primaryCue =
    last?.primaryCue ?? last?.correctionText ?? "站到画面中央，开始动作";
  const secondaryCue = last?.secondaryCue ?? "实时纠错提示会显示在这里";
  const phaseText = last?.phase ? PHASE_LABEL[last.phase] ?? last.phase : "—";

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCam]}>
          <Text style={styles.noCamEmoji}>📷</Text>
          <Text style={styles.noCamText}>
            {permission?.canAskAgain === false
              ? "摄像头未授权\n请在系统设置中开启后返回"
              : "正在请求摄像头权限…"}
          </Text>
          {permission?.canAskAgain !== false && (
            <PrimaryButton
              label="允许使用摄像头"
              onPress={requestPermission}
              style={{ marginTop: spacing(5), alignSelf: "stretch", marginHorizontal: spacing(8) }}
            />
          )}
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
        {/* ── 顶部栏 (BlurView) ── */}
        <BlurView intensity={20} tint="dark" style={styles.topBar}>
          <GlassBtn label="‹  返回" onPress={onBack} />
          <View style={[styles.statusBadge, { backgroundColor: palette.color }]}>
            <Text style={styles.statusBadgeText}>{palette.label}</Text>
          </View>
          <GlassBtn
            label={facing === "front" ? "前置  ⇄" : "后置  ⇄"}
            onPress={() => {
              lightHaptic();
              setFacing((f) => (f === "front" ? "back" : "front"));
            }}
          />
        </BlurView>

        {/* ── 次数 + 阶段 ── */}
        <View style={styles.metrics} pointerEvents="none">
          <Animated.View style={[styles.repCard, repAnimatedStyle]}>
            <BlurView intensity={15} tint="dark" style={styles.repBlur}>
              <Text style={styles.repValue}>{reps}</Text>
              <Text style={styles.repLabel}>{EXERCISE_LABEL[exercise]} · 次数</Text>
            </BlurView>
          </Animated.View>
          <View style={styles.phaseChip}>
            <BlurView intensity={20} tint="dark" style={styles.phaseBlur}>
              <Text style={styles.phaseLabel}>阶段</Text>
              <Text style={styles.phaseValue}>{phaseText}</Text>
            </BlurView>
          </View>
        </View>

        {/* ── 底部反馈 + 控制 ── */}
        <View style={styles.bottom}>
          <GlassCard style={styles.cueCard} intensity={30}>
            <View style={[styles.cueLeftBar, { backgroundColor: palette.color }]} />
            <View style={styles.cueContent}>
              <View style={styles.cueHeader}>
                <View style={[styles.cueDot, { backgroundColor: palette.color }]} />
                <Text style={[styles.cueTag, { color: palette.color }]}>{palette.label}</Text>
              </View>
              <Text style={styles.cuePrimary} numberOfLines={2}>{primaryCue}</Text>
              <Text style={styles.cueSecondary} numberOfLines={2}>{secondaryCue}</Text>
            </View>
          </GlassCard>

          <View style={styles.controls}>
            <PrimaryButton
              label={running ? "暂停" : "继续"}
              onPress={togglePause}
              disabled={!cameraReady}
              tone={running ? colors.warn : colors.good}
              style={styles.ctrlBtn}
            />
            <PrimaryButton
              label="结束"
              onPress={onEnd}
              tone={colors.alert}
              style={styles.ctrlBtn}
            />
          </View>

          <Text style={styles.statusMsg}>{statusMsg}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GlassBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.glassBtn, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.glassBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  noCam: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(6),
    backgroundColor: colors.bgElevated,
  },
  noCamEmoji: { fontSize: 48, marginBottom: spacing(4) },
  noCamText: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    fontSize: font.body,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  /* ── 顶部 ── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    overflow: "hidden",
  },
  glassBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3.5),
    borderRadius: radius.pill,
  },
  glassBtnText: { color: colors.text, fontWeight: "600", fontSize: font.small },
  statusBadge: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(5),
    borderRadius: radius.pill,
    ...elevation("float"),
  },
  statusBadgeText: { color: "#000", fontWeight: "800", fontSize: font.small, letterSpacing: 0.5 },

  /* ── 中部次数 ── */
  metrics: { alignItems: "center", gap: spacing(2) },
  repCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  repBlur: {
    alignItems: "center",
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(10),
  },
  repValue: {
    color: colors.text,
    fontSize: font.bigNumber,
    fontWeight: "900",
    lineHeight: font.bigNumber + 8,
    letterSpacing: -3,
  },
  repLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: "500",
    marginTop: spacing(0.5),
  },
  phaseChip: { borderRadius: radius.pill, overflow: "hidden" },
  phaseBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
  },
  phaseLabel: {
    color: colors.textFaint,
    fontSize: font.caption,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  phaseValue: { color: colors.text, fontSize: font.body, fontWeight: "700" },

  /* ── 底部 ── */
  bottom: { gap: spacing(3), paddingHorizontal: spacing(4) },
  cueCard: {
    flexDirection: "row",
    overflow: "hidden",
    padding: 0,
    ...elevation("hero"),
  },
  cueLeftBar: { width: 5 },
  cueContent: {
    flex: 1,
    padding: spacing(4.5),
  },
  cueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    marginBottom: spacing(2.5),
  },
  cueDot: { width: 8, height: 8, borderRadius: 4 },
  cueTag: { fontSize: font.caption, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  cuePrimary: { color: colors.text, fontSize: font.h2, fontWeight: "700", lineHeight: 28 },
  cueSecondary: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: spacing(2),
    lineHeight: 20,
  },

  controls: { flexDirection: "row", gap: spacing(3) },
  ctrlBtn: { flex: 1 },
  statusMsg: { color: colors.textFaint, fontSize: font.caption, textAlign: "center" },
});
