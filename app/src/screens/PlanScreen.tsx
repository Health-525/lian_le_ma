/**
 * 计划页：按 7 天展示训练计划，进入训练页（需求 2.9）。
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Plan">;

const WEEKDAYS = ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天", "第7天"];

export default function PlanScreen({ navigation }: Props) {
  const plan = useAppStore((s) => s.plan);

  if (!plan) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有计划，请先完成评估。</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>我的 7 天计划</Text>
      {plan.days.map((day) => (
        <View key={day.dayIndex} style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayTitle}>{WEEKDAYS[day.dayIndex - 1]}</Text>
            <Text style={day.isRestDay ? styles.restTag : styles.trainTag}>
              {day.isRestDay ? "休息" : "训练"}
            </Text>
          </View>
          {day.isRestDay ? (
            <Text style={styles.restText}>主动恢复 / 拉伸</Text>
          ) : (
            day.exercises.map((ex, idx) => (
              <View key={idx} style={styles.exRow}>
                <Text style={styles.exName}>
                  {ex.name}
                  {ex.exercise ? "  📷" : ""}
                </Text>
                <Text style={styles.exMeta}>
                  {ex.sets} 组 × {ex.reps} 次 · 休息 {ex.restSec}s · 难度{" "}
                  {ex.difficulty}
                </Text>
              </View>
            ))
          )}
        </View>
      ))}
      <Text style={styles.note}>📷 标记的动作支持摄像头动作纠错</Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Training")}
      >
        <Text style={styles.primaryBtnText}>开始训练</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#888" },
  h1: { fontSize: 26, fontWeight: "700", marginBottom: 16 },
  dayCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayTitle: { fontSize: 17, fontWeight: "700" },
  trainTag: { color: "#16a34a", fontWeight: "600" },
  restTag: { color: "#999" },
  restText: { color: "#999" },
  exRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#f3f3f3" },
  exName: { fontSize: 15, fontWeight: "600" },
  exMeta: { color: "#666", marginTop: 2, fontSize: 13 },
  note: { color: "#888", fontSize: 12, marginTop: 4 },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
