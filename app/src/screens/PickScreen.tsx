/**
 * 选动作页（健身 tab 第一步）。iOS 大标题风格。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { isModelConnected } from "../analysis";
import { Card } from "../ui/components";
import { colors, font, radius, spacing } from "../ui/theme";
import { EXERCISES, type ExerciseMeta } from "../types";
import type { FitnessStackParamList } from "../navigation";

type Props = NativeStackScreenProps<FitnessStackParamList, "Pick">;

export default function PickScreen({ navigation }: Props) {
  const connected = isModelConnected();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* 顶部毛玻璃栏 */}
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
          <Text style={styles.brand}>练了吗</Text>
          <Text style={styles.tagline}>选择动作，开始实时姿势矫正</Text>
        </BlurView>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {EXERCISES.map((e) => (
              <ExerciseRow
                key={e.value}
                meta={e}
                onPress={() => navigation.navigate("Training", { exercise: e.value })}
              />
            ))}
          </View>

          <View style={styles.footer}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: connected ? colors.good : colors.textFaint },
                ]}
              />
              <Text style={[styles.statusText, { color: connected ? colors.good : colors.textFaint }]}>
                {connected ? "模型已连接" : "演示模式"}
              </Text>
            </View>
            <Text style={styles.disclaimer}>反馈仅供参考，不构成医疗建议。</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ExerciseRow({ meta, onPress }: { meta: ExerciseMeta; onPress: () => void }) {
  return (
    <Card style={styles.row} onPress={onPress}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{meta.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{meta.label}</Text>
        <Text style={styles.muscle}>{meta.muscle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },

  headerBlur: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  brand: {
    fontSize: font.display,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing(1),
  },

  container: { padding: spacing(5), paddingTop: spacing(4), paddingBottom: spacing(8) },

  list: { gap: spacing(3) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(4),
    paddingVertical: spacing(4.5),
    paddingHorizontal: spacing(4),
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 28 },
  info: { flex: 1, gap: spacing(0.5) },
  label: { fontSize: font.h2, fontWeight: "600", color: colors.text },
  muscle: { fontSize: font.small, color: colors.textFaint },
  chevron: { fontSize: 28, color: colors.textFaint, fontWeight: "200" },

  footer: {
    marginTop: spacing(8),
    alignItems: "center",
    gap: spacing(2),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: font.small, fontWeight: "600" },
  disclaimer: {
    color: colors.textFaint,
    fontSize: font.caption,
    textAlign: "center",
  },
});
