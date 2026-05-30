/**
 * 实时姿势矫正页（高级沉浸式）。
 *
 * 设计：全屏摄像头 + 上下渐变遮罩 + 玻璃质感叠加层。
 *  - 顶部：返回 / 动作名胶囊 / 翻转，半透明玻璃按钮
 *  - 中部：超大次数 + 动态状态环（颜色随 good/warn/alert 平滑过渡，呼吸脉冲）
 *  - 底部：玻璃提示卡（主/副提示，左侧状态色条）+ 暂停/结束
 * 进入即请求权限自动开始，每 FRAME_INTERVAL_MS 抓帧送分析层。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  getFormProvider,
  stopFormSession,
  type FormAnalysisResult,
} from "../analysis";
import { heavyHaptic, lightHaptic } from "../ui/haptics";
import { colors, font, radius, spacing, toneOf, type StatusTone } from "../ui/theme";
import { EXERCISE_LABEL } from "../types";
import type { WorkoutStackParamList } from "../navigation";

type Props = NativeStackScreenProps<WorkoutStackParamList, "Training">;

const FRAME_INTERVAL_MS = 150;
const RING = 260;

const PHASE_LABEL: Record<string, string> = {
  up: "上升", down: "下降", ready: "准备", hold: "保持", lowering: "下放", rising: "上举",
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
  const failCountRef = useRef(0);

  // 状态环呼吸脉冲
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const ringStyle = { transform: [{ scale: pulse }] };

  const sendFrame = useCallback(async () => {
    if (busyRef.current || !runningRef.current) return;
    if (!cameraRef.current || !permission?.granted) return;
    busyRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.3, skipProcessing: true, base64: true, shutterSound: false, imageType: "jpg" });
      const result = await getFormProvider().analyze({ exercise, imageBase64: photo?.base64 });
      setLast(result);
      if (typeof result.repCount === "number") setReps(result.repCount);
      // 成功一帧：清零失败计数，恢复正常状态文字。
      failCountRef.current = 0;
      setStatusMsg("训练中 · 实时分析");
    } catch {
      // 仅在连续多帧失败时才提示，避免偶发单帧抖动误报。
      failCountRef.current += 1;
      if (failCountRef.current >= 3) {
        setStatusMsg("帧分析失败，请检查模型服务连接");
      }
    } finally {
      busyRef.current = false;
    }
  }, [exercise, permission?.granted]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setStatusMsg("训练中 · 实时分析");
    sendFrame();
    timerRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS);
  }, [sendFrame]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (permission?.granted && !runningRef.current) startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);
  useEffect(() => () => { stopLoop(); void stopFormSession(); }, [stopLoop]);

  const onBack = () => { heavyHaptic(); stopLoop(); void stopFormSession(); navigation.goBack(); };
  const togglePause = () => {
    lightHaptic();
    if (runningRef.current) { stopLoop(); setStatusMsg("已暂停 · 点击继续"); }
    else startLoop();
  };

  const cameraReady = permission?.granted === true;
  const tone: StatusTone = (last?.statusColor as StatusTone) ?? "idle";
  const palette = toneOf(tone);
  const primaryCue = last?.primaryCue ?? last?.correctionText ?? "站到画面中央，开始动作";
  const secondaryCue = last?.secondaryCue ?? "AI 实时分析你的每一下";
  const phaseText = last?.phase ? PHASE_LABEL[last.phase] ?? last.phase : "—";

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCam]}>
          <Text style={styles.noCamEmoji}>📷</Text>
          <Text style={styles.noCamText}>
            {permission?.canAskAgain === false ? "摄像头未授权\n请在系统设置中开启后返回" : "正在请求摄像头权限…"}
          </Text>
          {permission?.canAskAgain !== false && (
            <Pressable style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>允许使用摄像头</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 上下渐变遮罩，提升叠加层可读性与高级感 */}
      <LinearGradient
        colors={["rgba(8,11,16,0.78)", "rgba(8,11,16,0)", "rgba(8,11,16,0)", "rgba(8,11,16,0.9)"]}
        locations={[0, 0.28, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]} pointerEvents="box-none">
        {/* 顶部 */}
        <View style={styles.topBar}>
          <GlassBtn label="‹" round onPress={onBack} />
          <BlurView intensity={28} tint="dark" style={styles.exerciseChip}>
            <View style={[styles.toneDot, { backgroundColor: palette.color }]} />
            <Text style={styles.exerciseChipText}>{EXERCISE_LABEL[exercise]}</Text>
          </BlurView>
          <GlassBtn label="⇄" round onPress={() => { lightHaptic(); setFacing((f) => (f === "front" ? "back" : "front")); }} />
        </View>

        {/* 中部：状态环 + 次数 */}
        <View style={styles.center}>
          <Animated.View style={[styles.ring, { borderColor: palette.color }, ringStyle]}>
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

        {/* 底部：提示卡 + 控制 */}
        <View style={styles.bottom}>
          <BlurView intensity={32} tint="dark" style={[styles.cueCard, { borderLeftColor: palette.color }]}>
            <Text style={styles.cuePrimary} numberOfLines={2}>{primaryCue}</Text>
            <Text style={styles.cueSecondary} numberOfLines={2}>{secondaryCue}</Text>
          </BlurView>

          <View style={styles.controls}>
            <Pressable
              onPress={togglePause}
              disabled={!cameraReady}
              style={[styles.ctrlBtn, { backgroundColor: running ? "rgba(255,255,255,0.16)" : colors.accent }]}
            >
              <Text style={styles.ctrlText}>{running ? "暂停" : "继续"}</Text>
            </Pressable>
            <Pressable onPress={onBack} style={[styles.ctrlBtn, styles.ctrlEnd]}>
              <Text style={styles.ctrlText}>结束</Text>
            </Pressable>
          </View>

          <Text style={styles.statusMsg}>{statusMsg}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function GlassBtn({ label, onPress, round }: { label: string; onPress: () => void; round?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <BlurView intensity={28} tint="dark" style={[styles.glassBtn, round && styles.glassBtnRound]}>
        <Text style={styles.glassBtnText}>{label}</Text>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  noCam: { alignItems: "center", justifyContent: "center", padding: spacing(6), backgroundColor: colors.darkBg },
  noCamEmoji: { fontSize: 48, marginBottom: spacing(4) },
  noCamText: { color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 24, fontSize: font.body },
  permBtn: { marginTop: spacing(5), backgroundColor: colors.accent, paddingVertical: spacing(3.5), paddingHorizontal: spacing(8), borderRadius: radius.md },
  permBtnText: { color: colors.onAccent, fontWeight: "800", fontSize: font.h3 },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: spacing(4) },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  glassBtn: { paddingVertical: spacing(2.5), paddingHorizontal: spacing(4), borderRadius: radius.pill, overflow: "hidden", borderWidth: 1, borderColor: colors.darkBorder },
  glassBtnRound: { width: 44, height: 44, paddingVertical: 0, paddingHorizontal: 0, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  glassBtnText: { color: "#fff", fontWeight: "800", fontSize: font.h2 },
  exerciseChip: { flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: spacing(2.5), paddingHorizontal: spacing(4), borderRadius: radius.pill, overflow: "hidden", borderWidth: 1, borderColor: colors.darkBorder },
  exerciseChipText: { color: "#fff", fontWeight: "800", fontSize: font.body },

  center: { alignItems: "center", gap: spacing(4) },
  ring: { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 6, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,11,16,0.25)" },
  ringInner: { alignItems: "center", justifyContent: "center", flexDirection: "row" },
  repValue: { color: "#fff", fontSize: 96, fontWeight: "900", letterSpacing: -3, lineHeight: 100 },
  repUnit: { color: "rgba(255,255,255,0.7)", fontSize: font.h2, fontWeight: "700", marginLeft: spacing(2), marginBottom: spacing(4) },
  statusPill: { flexDirection: "row", alignItems: "center", gap: spacing(2), paddingVertical: spacing(2), paddingHorizontal: spacing(4), borderRadius: radius.pill, overflow: "hidden", borderWidth: 1, borderColor: colors.darkBorder },
  toneDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: font.body, fontWeight: "800" },
  phaseText: { color: "rgba(255,255,255,0.7)", fontSize: font.small, fontWeight: "600" },

  bottom: { gap: spacing(3.5) },
  cueCard: { borderRadius: radius.lg, padding: spacing(4.5), borderLeftWidth: 5, overflow: "hidden" },
  cuePrimary: { color: "#fff", fontSize: font.h2, fontWeight: "800", lineHeight: 28 },
  cueSecondary: { color: "rgba(255,255,255,0.72)", fontSize: font.small, marginTop: spacing(2), lineHeight: 19 },

  controls: { flexDirection: "row", gap: spacing(3) },
  ctrlBtn: { flex: 1, minHeight: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.darkBorder },
  ctrlEnd: { backgroundColor: "rgba(255,77,79,0.92)", borderColor: "transparent" },
  ctrlText: { color: "#fff", fontSize: font.h3, fontWeight: "800" },
  statusMsg: { color: "rgba(255,255,255,0.65)", fontSize: font.tiny, textAlign: "center" },
});
