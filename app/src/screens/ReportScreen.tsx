/**
 * 报告页：展示动作分、风险提示、纠正次数、下一次重点（需求 7）。
 */
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { LogoMark, PillBadge, TechLabel, aura } from "../ui/aura";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

function scoreTone(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "STABLE", color: "#16a34a" };
  if (score >= 60) return { label: "ADJUST", color: "#d97706" };
  return { label: "REBUILD", color: "#ba1a1a" };
}

export default function ReportScreen({ navigation }: Props) {
  const report = useAppStore((s) => s.report);

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <LogoMark size={42} inverted />
          <Text style={styles.emptyTitle}>报告未生成</Text>
          <Text style={styles.emptyText}>请先完成一次训练会话。</Text>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.lightBtn}
            onPress={() => navigation.navigate("Training")}
          >
            <Text style={styles.lightBtnText}>进入训练</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tone = scoreTone(report.formScore);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LogoMark size={32} inverted />
          <View style={styles.headerCopy}>
            <TechLabel light>SESSION_REPORT</TechLabel>
            <Text style={styles.h1}>训练报告</Text>
            <Text style={styles.subtitle}>
              本次动作数据已汇总为动作分、纠正次数与下一次重点。
            </Text>
          </View>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreTop}>
            <TechLabel>FORM_SCORE</TechLabel>
            <PillBadge active>{tone.label}</PillBadge>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: tone.color }]}>
              {report.formScore}
            </Text>
            <Text style={styles.scoreUnit}>/100</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNum}>{report.correctionCount}</Text>
          <View style={styles.statCopy}>
            <TechLabel>CORRECTIONS</TechLabel>
            <Text style={styles.statLabel}>本次训练纠正次数</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <TechLabel>RISK_NOTES</TechLabel>
            <PillBadge>REF</PillBadge>
          </View>
          {report.riskNotes.map((note, idx) => (
            <Text key={idx} style={styles.infoText}>
              {note}
            </Text>
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <TechLabel>NEXT_FOCUS</TechLabel>
            <PillBadge>PLAN</PillBadge>
          </View>
          <Text style={styles.infoTitle}>{report.nextFocus}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.lightBtn}
          onPress={() => navigation.navigate("Plan")}
        >
          <Text style={styles.lightBtnText}>返回计划</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.outlineBtn}
          onPress={() => navigation.navigate("Training")}
        >
          <Text style={styles.outlineBtnText}>再练一次</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>本报告仅供参考，不构成医疗建议。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    padding: 16,
    paddingBottom: 34,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
  },
  h1: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 8,
  },
  subtitle: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  scoreCard: {
    backgroundColor: aura.colors.surfaceSoft,
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: aura.radius.lg,
    borderWidth: 1,
    padding: 18,
    shadowColor: aura.colors.blueSoft,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 4,
  },
  scoreTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 14,
  },
  scoreValue: {
    fontFamily: aura.font.uiHeavy,
    fontSize: 68,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 78,
  },
  scoreUnit: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.mono,
    fontSize: 16,
    marginBottom: 12,
    marginLeft: 6,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: aura.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
    padding: 16,
  },
  statNum: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 38,
    fontWeight: "900",
    minWidth: 62,
    textAlign: "center",
  },
  statCopy: {
    flex: 1,
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: aura.colors.surfaceSoft,
    borderRadius: aura.radius.md,
    marginTop: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  infoText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 23,
    marginBottom: 6,
  },
  infoTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 26,
  },
  lightBtn: {
    alignItems: "center",
    backgroundColor: aura.colors.surface,
    borderRadius: aura.radius.pill,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 52,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 5,
  },
  lightBtnText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "900",
  },
  outlineBtn: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
  },
  outlineBtnText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
  },
  disclaimer: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
  empty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 22,
  },
  emptyText: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
});
