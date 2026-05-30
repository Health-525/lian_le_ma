/**
 * 运动首页（Keep 风格）。
 * 浅色干净背景 + 动作横向选择 + 大圆形「GO」开始按钮。
 * 选中动作后点 GO 进入实时姿势矫正。
 */
import { useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { springBouncy, springGentle } from "../ui/animation";
import { heavyHaptic, lightHaptic } from "../ui/haptics";
import { colors, elevation, font, radius, spacing } from "../ui/theme";
import { EXERCISES, type SupportedExercise } from "../types";
import type { WorkoutStackParamList } from "../navigation";

const LOGO = require("../../assets/logo.png");

type Props = NativeStackScreenProps<WorkoutStackParamList, "Pick">;

export default function PickScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<SupportedExercise>(EXERCISES[0]!.value);
  const current = EXERCISES.find((e) => e.value === selected) ?? EXERCISES[0]!;

  const go = () => {
    heavyHaptic();
    navigation.navigate("Training", { exercise: selected });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 顶部品牌：居中大 logo */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <Text style={styles.subtitle}>AI 实时姿势矫正</Text>
        </View>

        {/* 动作选择 */}
        <Text style={styles.sectionTitle}>选择训练动作</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {EXERCISES.map((e) => {
            const active = e.value === selected;
            return (
              <Pressable
                key={e.value}
                onPress={() => { lightHaptic(); setSelected(e.value); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={styles.chipEmoji}>{e.emoji}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 当前动作信息卡 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>{current.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{current.label}</Text>
            <Text style={styles.infoMuscle}>{current.muscle}</Text>
            <Text style={styles.infoTip}>{current.tip}</Text>
          </View>
        </View>

        {/* 大圆形 GO 按钮 */}
        <View style={styles.goWrap}>
          <GoButton onPress={go} />
          <Text style={styles.goHint}>点击开始 · {current.label}</Text>
        </View>

        <Text style={styles.disclaimer}>反馈仅供参考，不构成医疗建议。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function GoButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, ...springGentle }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...springBouncy }).start()}
        style={styles.goBtn}
      >
        <Text style={styles.goText}>GO</Text>
      </Pressable>
    </Animated.View>
  );
}

const GO_SIZE = 132;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(8) },

  header: { alignItems: "center", marginTop: spacing(4), marginBottom: spacing(2) },
  logo: { width: 200, height: 200 },
  subtitle: { fontSize: font.body, color: colors.textMuted, marginTop: spacing(1) },
  statusDot: { flexDirection: "row", alignItems: "center", gap: spacing(1.5), paddingVertical: spacing(1.5), paddingHorizontal: spacing(3), borderRadius: radius.pill, marginTop: spacing(2) },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: font.tiny, fontWeight: "700" },

  sectionTitle: { fontSize: font.small, fontWeight: "700", color: colors.textFaint, letterSpacing: 0.5, marginTop: spacing(8), marginBottom: spacing(3) },
  chips: { gap: spacing(3), paddingRight: spacing(5) },
  chip: { width: 92, paddingVertical: spacing(4), borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, alignItems: "center", gap: spacing(2), borderWidth: 2, borderColor: "transparent" },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipEmoji: { fontSize: 30 },
  chipLabel: { fontSize: font.small, fontWeight: "700", color: colors.textMuted },
  chipLabelActive: { color: colors.accentDeep },

  infoCard: { flexDirection: "row", gap: spacing(4), alignItems: "center", marginTop: spacing(6), padding: spacing(4), backgroundColor: colors.bgElevated, borderRadius: radius.lg },
  infoEmoji: { fontSize: 44 },
  infoLabel: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  infoMuscle: { fontSize: font.small, color: colors.accentDeep, fontWeight: "600", marginTop: spacing(0.5) },
  infoTip: { fontSize: font.small, color: colors.textMuted, marginTop: spacing(2), lineHeight: 19 },

  goWrap: { alignItems: "center", marginTop: spacing(10), gap: spacing(4) },
  goBtn: {
    width: GO_SIZE,
    height: GO_SIZE,
    borderRadius: GO_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...elevation("hero"),
  },
  goText: { color: colors.onAccent, fontSize: 38, fontWeight: "900", letterSpacing: 1 },
  goHint: { fontSize: font.body, color: colors.textMuted, fontWeight: "600" },

  disclaimer: { marginTop: spacing(10), color: colors.textFaint, fontSize: font.tiny, textAlign: "center" },
});
