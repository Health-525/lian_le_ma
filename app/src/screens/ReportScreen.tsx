/**
 * 报告页：展示动作分、风险提示、纠正次数、下一次重点（需求 7）。
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

export default function ReportScreen({ navigation }: Props) {
  const report = useAppStore((s) => s.report);

  if (!report) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无报告，请先完成一次训练。</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>训练报告</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>动作分</Text>
        <Text style={[styles.scoreValue, { color: scoreColor(report.formScore) }]}>
          {report.formScore}
        </Text>
        <Text style={styles.scoreUnit}>/ 100</Text>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{report.correctionCount}</Text>
          <Text style={styles.statLabel}>纠正次数</Text>
        </View>
      </View>

      <Text style={styles.section}>风险提示</Text>
      {report.riskNotes.map((note, idx) => (
        <Text key={idx} style={styles.risk}>
          • {note}
        </Text>
      ))}

      <Text style={styles.section}>下一次重点</Text>
      <Text style={styles.focus}>{report.nextFocus}</Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Plan")}
      >
        <Text style={styles.primaryBtnText}>返回计划</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate("Training")}
      >
        <Text style={styles.secondaryBtnText}>再练一次</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>本报告仅供参考，不构成医疗建议。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#888" },
  h1: { fontSize: 26, fontWeight: "700", marginBottom: 16 },
  scoreCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
  },
  scoreLabel: {
    position: "absolute",
    top: 12,
    left: 16,
    color: "#888",
    fontSize: 13,
  },
  scoreValue: { fontSize: 64, fontWeight: "800" },
  scoreUnit: { fontSize: 18, color: "#9ca3af", marginBottom: 12, marginLeft: 4 },
  statRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontWeight: "700", color: "#2563eb" },
  statLabel: { color: "#666", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  risk: { color: "#444", lineHeight: 20, marginBottom: 4 },
  focus: { color: "#111", fontSize: 15, lineHeight: 22 },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: { marginTop: 12, paddingVertical: 14, alignItems: "center" },
  secondaryBtnText: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
  disclaimer: { marginTop: 20, color: "#9ca3af", fontSize: 12, textAlign: "center" },
});
