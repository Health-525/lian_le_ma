import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WorkoutStackParamList } from "../navigation";
import { EXERCISE_LABEL } from "../types";
import { Card, GhostButton } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<WorkoutStackParamList, "WorkoutReport">;

export default function WorkoutReportScreen({ navigation, route }: Props) {
  const { report } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>本次训练总结</Text>
        <Text style={styles.subtitle}>{report.summary_text || "训练已完成，继续保持。"}</Text>

        <View style={styles.metrics}>
          <MetricCard label="消耗热量" value={`${report.estimated_calories} kcal`} />
          <MetricCard label="总次数" value={String(report.total_reps)} />
          <MetricCard label="动作评分" value={String(report.form_score)} />
          <MetricCard label="整体评分" value={String(report.overall_score)} />
        </View>

        <Card>
          <Text style={styles.sectionTitle}>动作明细</Text>
          {report.exercise_breakdown.length ? (
            report.exercise_breakdown.map((item) => (
              <View key={item.exercise} style={styles.block}>
                <Text style={styles.line}>
                  {EXERCISE_LABEL[item.exercise]}：{item.reps} 次 · {item.estimated_calories} kcal
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.line}>本次训练暂无动作明细。</Text>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>下一步重点</Text>
          <Text style={styles.line}>{report.next_focus}</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>风险提示</Text>
          {(report.risk_notes.length ? report.risk_notes : ["当前无额外风险提示。"]).map(
            (note) => (
              <Text key={note} style={styles.line}>
                • {note}
              </Text>
            )
          )}
        </Card>

        <GhostButton
          label="返回动作选择"
          onPress={() => navigation.popToTop()}
          style={{ marginTop: spacing(2) }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(10), gap: spacing(4) },
  title: { fontSize: font.display, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  metricCard: {
    width: "47%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    padding: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: { fontSize: font.h1, fontWeight: "900", color: colors.text },
  metricLabel: { fontSize: font.small, color: colors.textMuted, fontWeight: "700" },
  sectionTitle: {
    fontSize: font.h2,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing(2),
  },
  block: { paddingVertical: spacing(1) },
  line: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
});
