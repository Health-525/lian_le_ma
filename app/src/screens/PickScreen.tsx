import { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { isModelConnected } from "../analysis";
import type { WorkoutStackParamList } from "../navigation";
import { EXERCISES, type SupportedExercise } from "../types";
import { springBouncy, springGentle } from "../ui/animation";
import { heavyHaptic, lightHaptic } from "../ui/haptics";
import { colors, elevation, font, radius, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<WorkoutStackParamList, "Pick">;

const GO_SIZE = 132;

export default function PickScreen({ navigation }: Props) {
  const connected = isModelConnected();
  const [selected, setSelected] = useState<SupportedExercise>(EXERCISES[0]!.value);
  const current = EXERCISES.find((item) => item.value === selected) ?? EXERCISES[0]!;

  const go = () => {
    heavyHaptic();
    navigation.navigate("Training", { exercise: selected });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>练了吗</Text>
            <Text style={styles.subtitle}>AI 实时计数、纠错和训练总结</Text>
          </View>
          <View
            style={[
              styles.status,
              {
                backgroundColor: connected ? colors.accentSoft : colors.surfaceAlt,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connected ? colors.accent : colors.textFaint },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: connected ? colors.accentDeep : colors.textMuted },
              ]}
            >
              {connected ? "后端已连接" : "演示模式"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>选择训练动作</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {EXERCISES.map((exercise) => {
            const active = exercise.value === selected;
            return (
              <Pressable
                key={exercise.value}
                onPress={() => {
                  lightHaptic();
                  setSelected(exercise.value);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={styles.chipEmoji}>{exercise.emoji}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                  {exercise.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>{current.emoji}</Text>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{current.label}</Text>
            <Text style={styles.heroMuscle}>{current.muscle}</Text>
            <Text style={styles.heroBlurb}>{current.blurb}</Text>
            <Text style={styles.heroTip}>{current.tip}</Text>
          </View>
        </View>

        <View style={styles.goWrap}>
          <GoButton onPress={go} />
          <Text style={styles.goHint}>点击开始 {current.label}</Text>
        </View>

        <Text style={styles.note}>
          训练结束后会自动生成总次数、消耗热量、整体评分和重点改进建议。
        </Text>
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
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.92,
            useNativeDriver: true,
            ...springGentle,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            ...springBouncy,
          }).start()
        }
        style={styles.goButton}
      >
        <Text style={styles.goText}>GO</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(8) },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: spacing(2),
    gap: spacing(3),
  },
  brand: {
    fontSize: font.display,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing(1),
    lineHeight: 22,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1.5),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    marginTop: spacing(2),
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: font.tiny, fontWeight: "700" },
  sectionTitle: {
    marginTop: spacing(8),
    marginBottom: spacing(3),
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  chips: { gap: spacing(3), paddingRight: spacing(5) },
  chip: {
    width: 96,
    paddingVertical: spacing(4),
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    gap: spacing(2),
    borderWidth: 2,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipEmoji: { fontSize: 30 },
  chipLabel: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
  },
  chipLabelActive: { color: colors.accentDeep },
  heroCard: {
    flexDirection: "row",
    gap: spacing(4),
    marginTop: spacing(6),
    padding: spacing(4),
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
  },
  heroEmoji: { fontSize: 44 },
  heroBody: { flex: 1, gap: spacing(1) },
  heroTitle: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  heroMuscle: { fontSize: font.small, color: colors.accentDeep, fontWeight: "700" },
  heroBlurb: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  heroTip: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
  goWrap: {
    alignItems: "center",
    marginTop: spacing(10),
    gap: spacing(4),
  },
  goButton: {
    width: GO_SIZE,
    height: GO_SIZE,
    borderRadius: GO_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...elevation("hero"),
  },
  goText: {
    color: colors.onAccent,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 1,
  },
  goHint: { fontSize: font.body, color: colors.textMuted, fontWeight: "700" },
  note: {
    marginTop: spacing(10),
    color: colors.textFaint,
    fontSize: font.small,
    textAlign: "center",
    lineHeight: 20,
  },
});
