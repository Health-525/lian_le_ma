/**
 * 音色页（音色 tab）—— iOS 底部 Sheet 呈现。
 *
 * 进入后自动弹出音色选择面板，选中或点击遮罩关闭并回到健身 tab。
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, font, radius, spacing } from "../ui/theme";
import { springBouncy, duration } from "../ui/animation";
import { lightHaptic } from "../ui/haptics";

interface VoiceOption {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  locked?: boolean;
}

const VOICES: VoiceOption[] = [
  { id: "default", name: "系统音色", desc: "设备自带中文语音，免费即用", emoji: "🗣️" },
  { id: "energetic", name: "活力教练", desc: "节奏明快，适合高强度训练", emoji: "🔥" },
  { id: "calm", name: "沉稳教练", desc: "语气平稳，适合控制与拉伸", emoji: "🧘" },
  { id: "cloned", name: "克隆音色", desc: "上传样本，定制专属声音", emoji: "✨", locked: true },
];

export default function VoiceScreen({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState("default");

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(300);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: duration.normal });
    sheetTranslateY.value = withSpring(0, springBouncy);
  }, [backdropOpacity, sheetTranslateY]);

  const dismiss = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: duration.fast });
    sheetTranslateY.value = withSpring(300, springBouncy);
    setTimeout(onClose, 250);
  }, [backdropOpacity, sheetTranslateY, onClose]);

  const selectVoice = useCallback(
    (id: string) => {
      lightHaptic();
      setSelected(id);
      setTimeout(dismiss, 400);
    },
    [dismiss]
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <BlurView intensity={40} tint="dark" style={styles.sheetBlur}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <Text style={styles.title}>选择教练音色</Text>

          <View style={styles.list}>
            {VOICES.map((v) => {
              const active = v.id === selected;
              return (
                <Pressable
                  key={v.id}
                  disabled={v.locked}
                  onPress={() => selectVoice(v.id)}
                  style={({ pressed }) => [
                    styles.row,
                    active && styles.rowActive,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.iconBox}>
                    <Text style={styles.icon}>{v.emoji}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{v.name}</Text>
                    <Text style={styles.desc}>{v.desc}</Text>
                  </View>
                  {v.locked ? (
                    <Text style={styles.lockIcon}>🔒</Text>
                  ) : (
                    <View style={[styles.radio, active && styles.radioOn]}>
                      {active && (
                        <Animated.View style={styles.radioDot} />
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.disclaimer}>
            音色仅影响语音播报，不影响动作识别结果。
          </Text>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetBlur: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
    padding: spacing(5),
    paddingBottom: spacing(9),
  },
  handle: { alignItems: "center", marginBottom: spacing(3) },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: font.h1,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(5),
  },

  list: { gap: spacing(2.5) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3.5),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(3),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowActive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.accent,
  },
  rowPressed: { opacity: 0.7 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 24 },

  info: { flex: 1, gap: 2 },
  name: { fontSize: font.h3, fontWeight: "600", color: colors.text },
  desc: { fontSize: font.small, color: colors.textFaint },

  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  lockIcon: { fontSize: 16 },

  disclaimer: {
    marginTop: spacing(6),
    color: colors.textFaint,
    fontSize: font.caption,
    textAlign: "center",
  },
});
