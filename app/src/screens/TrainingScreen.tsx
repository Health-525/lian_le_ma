import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import {
  CameraView,
  useCameraPermissions,
  type CameraMountError,
  type CameraType,
} from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";

import {
  getFormProvider,
  isModelConnected,
  stopFormSession,
  type FormAnalysisResult,
} from "../analysis";
import type { WorkoutStackParamList } from "../navigation";
import {
  getNextPhaseAfterPrimaryPress,
  getPrimaryControlLabel,
  isPrimaryControlDisabled,
  runCountdownSequence,
  type CountdownStep,
  type TrainingUiPhase,
} from "./trainingCountdown";
import { useSettings } from "../store/settings";
import { EXERCISE_LABEL } from "../types";
import { heavyHaptic, lightHaptic } from "../ui/haptics";
import { colors, font, radius, spacing, toneOf, type StatusTone } from "../ui/theme";

type Props = NativeStackScreenProps<WorkoutStackParamList, "Training">;

const FRAME_INTERVAL_MS = 650;
const RING_SIZE = 260;

const PHASE_LABEL: Record<string, string> = {
  ready: "准备",
  lowering: "下放",
  rising: "上推",
  bottom: "底部",
  top: "顶点",
  pulling: "拉起",
  curling: "弯举",
  opening: "打开",
  closing: "合并",
};

function normalizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "画面分析失败，请检查网络、摄像头和服务状态。";
  }

  const message = error.message.trim();
  if (!message) {
    return "画面分析失败，请检查网络、摄像头和服务状态。";
  }

  if (message.includes("Network request failed")) {
    return "无法连接后端，请确认手机和电脑在同一 Wi-Fi。";
  }
  if (message.includes("Internal Server Error")) {
    return "服务端处理失败，请重新进入训练页再试。";
  }
  if (message.includes("Missing EXPO_PUBLIC_API_BASE_URL")) {
    return "应用没有拿到后端地址，请重新扫码进入最新调试包。";
  }

  return message;
}

export default function TrainingScreen({ navigation, route }: Props) {
  const { exercise } = route.params;
  const {
    profile,
    voiceId,
    voiceEnabled,
    repAnnouncementsEnabled,
    encouragementEnabled,
  } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [trainingPhase, setTrainingPhase] = useState<TrainingUiPhase>("initializing");
  const [countdownStep, setCountdownStep] = useState<CountdownStep | null>(null);
  const [last, setLast] = useState<FormAnalysisResult | null>(null);
  const [reps, setReps] = useState(0);
  const [statusMsg, setStatusMsg] = useState("正在准备摄像头...");

  const cameraRef = useRef<CameraView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastSpeechRef = useRef("");
  const busyRef = useRef(false);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(0.82)).current;
  const countdownTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const countdownWaitResolversRef = useRef<Array<() => void>>([]);
  const countdownCancelledRef = useRef(false);

  const connected = isModelConnected();
  const cameraReady = permission?.granted === true && cameraInitialized;
  const running = trainingPhase === "running";

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
  }, []);

  const playCue = useCallback(
    async (result: FormAnalysisResult) => {
      const text = result.speechText || result.speakText;
      if (!voiceEnabled || !text || text === lastSpeechRef.current) {
        return;
      }

      if ((result.repDelta ?? 0) > 0 && !repAnnouncementsEnabled) {
        return;
      }

      const isEncouragement = !result.correctionText && (result.repDelta ?? 0) === 0;
      if (isEncouragement && !encouragementEnabled) {
        return;
      }

      lastSpeechRef.current = text;

      try {
        if (result.audioUrl) {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
          const created = await Audio.Sound.createAsync({ uri: result.audioUrl });
          soundRef.current = created.sound;
          await created.sound.playAsync();
          return;
        }
      } catch {
        // Fall through to local TTS.
      }

      Speech.stop();
      Speech.speak(text, {
        rate: voiceId === "system-energetic" ? 1.06 : 0.96,
        pitch: voiceId === "system-calm" ? 0.94 : 1.0,
      });
    },
    [encouragementEnabled, repAnnouncementsEnabled, voiceEnabled, voiceId]
  );

  const sendFrame = useCallback(async () => {
    if (busyRef.current || !runningRef.current) return;
    if (!cameraRef.current || !permission?.granted || !cameraInitialized) return;

    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        skipProcessing: true,
        base64: true,
      });
      if (!photo?.base64) {
        throw new Error("摄像头没有返回可分析的图像数据。");
      }

      const result = await getFormProvider({
        userId: profile.userId,
        voiceId,
      }).analyze({
        exercise,
        imageBase64: photo.base64,
        frameCount: 30,
      });

      setLast(result);
      setStatusMsg(connected ? "画面分析中..." : "演示模式");
      if (typeof result.repCount === "number") {
        setReps(result.repCount);
      }

      try {
        await playCue(result);
      } catch {
        // Voice playback errors should not be treated as frame-analysis failures.
      }
    } catch (error) {
      setStatusMsg(normalizeErrorMessage(error));
    } finally {
      busyRef.current = false;
    }
  }, [cameraInitialized, connected, exercise, permission?.granted, playCue, profile.userId, voiceId]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setTrainingPhase("running");
    setStatusMsg(connected ? "后端训练分析中..." : "当前为演示模式");
    void sendFrame();
    timerRef.current = setInterval(() => {
      void sendFrame();
    }, FRAME_INTERVAL_MS);
  }, [connected, sendFrame]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    countdownCancelledRef.current = true;

    for (const timer of countdownTimersRef.current) {
      clearTimeout(timer);
    }
    countdownTimersRef.current = [];

    const pendingResolvers = [...countdownWaitResolversRef.current];
    countdownWaitResolversRef.current = [];
    for (const resolve of pendingResolvers) {
      resolve();
    }

    countdownOpacity.stopAnimation();
    countdownScale.stopAnimation();
    countdownOpacity.setValue(0);
    countdownScale.setValue(0.82);
    setCountdownStep(null);
  }, [countdownOpacity, countdownScale]);

  const waitForCountdownBeat = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout>;

      const wrappedResolve = () => {
        countdownTimersRef.current = countdownTimersRef.current.filter((item) => item !== timer);
        countdownWaitResolversRef.current = countdownWaitResolversRef.current.filter(
          (item) => item !== wrappedResolve
        );
        resolve();
      };

      timer = setTimeout(wrappedResolve, ms);
      countdownTimersRef.current.push(timer);
      countdownWaitResolversRef.current.push(wrappedResolve);
    });
  }, []);

  const animateCountdownStep = useCallback(
    (step: CountdownStep) => {
      setCountdownStep(step);
      countdownOpacity.setValue(0);
      countdownScale.setValue(step === "Go!" ? 0.72 : 0.82);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(countdownOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(countdownOpacity, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(countdownScale, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [countdownOpacity, countdownScale]
  );

  const startCountdown = useCallback(async () => {
    if (!cameraReady || trainingPhase !== "ready_to_start") {
      return;
    }

    countdownCancelledRef.current = false;
    setTrainingPhase("countdown");
    setStatusMsg("跟着倒计时准备开始");
    Speech.stop();

    await runCountdownSequence({
      onStep: async (step) => {
        if (countdownCancelledRef.current) {
          return;
        }
        animateCountdownStep(step);
      },
      speak: async (utterance) => {
        if (!voiceEnabled || countdownCancelledRef.current) {
          return;
        }
        Speech.stop();
        Speech.speak(utterance, { rate: 1, pitch: 1 });
      },
      wait: waitForCountdownBeat,
    });

    if (countdownCancelledRef.current) {
      return;
    }

    setCountdownStep(null);
    startLoop();
  }, [
    animateCountdownStep,
    cameraReady,
    startLoop,
    trainingPhase,
    voiceEnabled,
    waitForCountdownBeat,
  ]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (permission?.granted && cameraInitialized && trainingPhase === "initializing") {
      setTrainingPhase("ready_to_start");
      setStatusMsg("摄像头已就绪，点击开始训练");
    }
  }, [cameraInitialized, permission?.granted, trainingPhase]);

  useEffect(() => {
    return () => {
      clearCountdown();
      stopLoop();
      Speech.stop();
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
    };
  }, [clearCountdown, stopLoop]);

  const onFinish = async () => {
    heavyHaptic();
    clearCountdown();
    stopLoop();
    const report = await stopFormSession();
    if (report) {
      navigation.replace("WorkoutReport", { report });
      return;
    }
    navigation.goBack();
  };

  const handlePrimaryAction = useCallback(() => {
    lightHaptic();

    if (isPrimaryControlDisabled(trainingPhase, cameraReady)) {
      return;
    }

    const nextPhase = getNextPhaseAfterPrimaryPress(trainingPhase);

    if (nextPhase === "countdown") {
      void startCountdown();
      return;
    }

    if (nextPhase === "paused") {
      clearCountdown();
      stopLoop();
      setTrainingPhase("paused");
      setStatusMsg("训练已暂停");
      return;
    }

    if (nextPhase === "running") {
      startLoop();
    }
  }, [cameraReady, clearCountdown, startCountdown, startLoop, stopLoop, trainingPhase]);

  const handleCameraReady = () => {
    setCameraInitialized(true);
  };

  const handleCameraMountError = (event: CameraMountError) => {
    clearCountdown();
    stopLoop();
    setTrainingPhase("initializing");
    setCameraInitialized(false);
    setStatusMsg(`摄像头启动失败：${event.message}`);
  };

  const tone: StatusTone = (last?.statusColor as StatusTone) ?? "idle";
  const palette = toneOf(tone);
  const primaryCue =
    trainingPhase === "ready_to_start"
      ? "站稳后点击开始训练，倒计时结束会自动开始计数。"
      : last?.primaryCue ?? last?.correctionText ?? "站在画面中央后开始动作。";
  const secondaryCue =
    trainingPhase === "ready_to_start"
      ? "首次开始会播报 1、2、3、Go，暂停后继续不会重复倒计时。"
      : last?.secondaryCue ?? "训练中会持续更新计数、纠错和语音提示。";
  const phaseText =
    trainingPhase === "countdown"
      ? "开始倒计时"
      : trainingPhase === "ready_to_start"
        ? "等待开始"
        : last?.phase
          ? PHASE_LABEL[last.phase] ?? last.phase
          : "等待动作";
  const primaryActionLabel = getPrimaryControlLabel(trainingPhase);
  const primaryActionDisabled = isPrimaryControlDisabled(trainingPhase, cameraReady);

  return (
    <View style={styles.root}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={handleCameraReady}
          onMountError={handleCameraMountError}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCam]}>
          <Text style={styles.noCamEmoji}>📷</Text>
          <Text style={styles.noCamText}>
            {permission?.canAskAgain === false
              ? "摄像头权限已被系统拦截，请前往系统设置开启。"
              : "正在请求摄像头权限..."}
          </Text>
          {permission?.canAskAgain !== false ? (
            <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
              <Text style={styles.permissionButtonText}>允许摄像头</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <LinearGradient
        colors={["rgba(8,11,16,0.82)", "rgba(8,11,16,0)", "rgba(8,11,16,0)", "rgba(8,11,16,0.92)"]}
        locations={[0, 0.28, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {countdownStep ? (
        <View pointerEvents="none" style={styles.countdownOverlay}>
          <Animated.Text
            style={[
              styles.countdownText,
              countdownStep === "Go!" && styles.countdownGoText,
              {
                opacity: countdownOpacity,
                transform: [{ scale: countdownScale }],
              },
            ]}
          >
            {countdownStep}
          </Animated.Text>
        </View>
      ) : null}

      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <GlassButton label="←" onPress={() => navigation.goBack()} />
          <BlurView intensity={28} tint="dark" style={styles.exerciseChip}>
            <View style={[styles.toneDot, { backgroundColor: palette.color }]} />
            <Text style={styles.exerciseChipText}>{EXERCISE_LABEL[exercise]}</Text>
          </BlurView>
          <GlassButton
            label="⇄"
            onPress={() => setFacing((current) => (current === "front" ? "back" : "front"))}
          />
        </View>

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.ring,
              { borderColor: palette.color },
              { transform: [{ scale: pulse }] },
            ]}
          >
            <View style={styles.ringInner}>
              <Text style={styles.repValue}>{reps}</Text>
              <Text style={styles.repUnit}>次</Text>
            </View>
          </Animated.View>
          <BlurView intensity={24} tint="dark" style={styles.statusPill}>
            <View style={[styles.toneDot, { backgroundColor: palette.color }]} />
            <Text style={[styles.statusPillText, { color: palette.color }]}>{palette.label}</Text>
            <Text style={styles.phaseText}>· {phaseText}</Text>
          </BlurView>
        </View>

        <View style={styles.bottom}>
          <BlurView
            intensity={32}
            tint="dark"
            style={[styles.cueCard, { borderLeftColor: palette.color }]}
          >
            <Text style={styles.cuePrimary}>{primaryCue}</Text>
            <Text style={styles.cueSecondary}>{secondaryCue}</Text>
          </BlurView>

          <View style={styles.controls}>
            <Pressable
              onPress={handlePrimaryAction}
              disabled={primaryActionDisabled}
              style={[
                styles.controlButton,
                primaryActionDisabled && styles.controlButtonDisabled,
                {
                  backgroundColor: running ? "rgba(255,255,255,0.16)" : colors.accent,
                },
              ]}
            >
              <Text style={styles.controlText}>{primaryActionLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => void onFinish()}
              style={[styles.controlButton, styles.finishButton]}
            >
              <Text style={styles.controlText}>结束训练</Text>
            </Pressable>
          </View>

          <Text style={styles.statusMsg}>{statusMsg}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GlassButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.72 } : null)}>
      <BlurView intensity={28} tint="dark" style={styles.glassButton}>
        <Text style={styles.glassButtonText}>{label}</Text>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  noCam: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing(6),
    backgroundColor: colors.darkBg,
  },
  noCamEmoji: { fontSize: 48, marginBottom: spacing(4) },
  noCamText: {
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 24,
    fontSize: font.body,
  },
  permissionButton: {
    marginTop: spacing(5),
    backgroundColor: colors.accent,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(8),
    borderRadius: radius.md,
  },
  permissionButtonText: {
    color: colors.onAccent,
    fontWeight: "800",
    fontSize: font.h3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: spacing(4),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  glassButtonText: { color: "#fff", fontWeight: "800", fontSize: font.h2 },
  exerciseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  exerciseChipText: { color: "#fff", fontWeight: "800", fontSize: font.body },
  center: { alignItems: "center", gap: spacing(4) },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,11,16,0.25)",
  },
  ringInner: { alignItems: "center", justifyContent: "center", flexDirection: "row" },
  repValue: {
    color: "#fff",
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 100,
  },
  repUnit: {
    color: "rgba(255,255,255,0.72)",
    fontSize: font.h2,
    fontWeight: "700",
    marginLeft: spacing(2),
    marginBottom: spacing(4),
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: font.body, fontWeight: "800" },
  phaseText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: font.small,
    fontWeight: "600",
  },
  bottom: { gap: spacing(3.5) },
  cueCard: {
    borderRadius: radius.lg,
    padding: spacing(4.5),
    borderLeftWidth: 5,
    overflow: "hidden",
  },
  cuePrimary: { color: "#fff", fontSize: font.h2, fontWeight: "800", lineHeight: 28 },
  cueSecondary: {
    color: "rgba(255,255,255,0.72)",
    fontSize: font.small,
    marginTop: spacing(2),
    lineHeight: 19,
  },
  controls: { flexDirection: "row", gap: spacing(3) },
  controlButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.darkBorder,
  },
  controlButtonDisabled: {
    opacity: 0.55,
  },
  finishButton: {
    backgroundColor: "rgba(255,77,79,0.92)",
    borderColor: "transparent",
  },
  controlText: { color: "#fff", fontSize: font.h3, fontWeight: "800" },
  statusMsg: {
    color: "rgba(255,255,255,0.75)",
    fontSize: font.small,
    textAlign: "center",
    lineHeight: 20,
    minHeight: 20,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,11,16,0.36)",
  },
  countdownText: {
    color: "#fff",
    fontSize: 112,
    fontWeight: "900",
    letterSpacing: -4,
    textAlign: "center",
  },
  countdownGoText: {
    color: colors.accent,
  },
});
