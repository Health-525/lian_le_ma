/**
 * 训练后报告：premium glass/bento 布局，展示动作分、纠正次数与下次重点。
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

import { TechLabel, aura } from "../ui/aura";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

function scoreSummary(score: number): { title: string; body: string; tone: string } {
  if (score >= 80) {
    return {
      title: "表现出色",
      body: "您今天的核心稳定性非常出色。继续保持动作控制。",
      tone: "#2a6fe5",
    };
  }
  if (score >= 60) {
    return {
      title: "状态稳定",
      body: "整体动作完成度良好，个别环节仍有细微调整空间。",
      tone: "#d97706",
    };
  }
  return {
    title: "需要调整",
    body: "本次训练出现较多动作偏差，下次应降低强度并优先修正动作。",
    tone: "#ba1a1a",
  };
}

function splitFocus(nextFocus: string): string[] {
  const text = nextFocus.replace(/[。.!！]/g, " ").trim();
  if (!text) return ["髋关节灵活性", "离心控制"];
  const parts = text
    .split(/[，,、]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2);
  return [text, "下次训练前进行 5 分钟常规热身"];
}

export default function ReportScreen({ navigation }: Props) {
  const report = useAppStore((s) => s.report);
  const reset = useAppStore((s) => s.reset);

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyBrand}>练了吗</Text>
          <Text style={styles.emptyTitle}>报告未生成</Text>
          <Text style={styles.emptyText}>请先完成一次训练会话。</Text>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.primaryButton}
            onPress={() => navigation.navigate("Training")}
          >
            <Text style={styles.primaryButtonText}>进入训练</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summary = scoreSummary(report.formScore);
  const focusItems = splitFocus(report.nextFocus);

  const goHome = () => {
    reset();
    navigation.navigate("Assessment");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="关闭报告"
          activeOpacity={0.82}
          style={styles.iconButton}
          onPress={() => navigation.navigate("Plan")}
        >
          <Text style={styles.iconButtonText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.brandTitle}>练了吗</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <TechLabel>训练结束</TechLabel>
          <Text style={styles.h1}>训练后报告</Text>
          <Text style={styles.subtitle}>
            这是您的动作细节、纠正建议和待改进领域的详细分解。
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreRing}>
            <View style={styles.scoreRingTrack}>
              <View
                style={[
                  styles.scoreRingFill,
                  {
                    borderTopColor: summary.tone,
                    borderRightColor: summary.tone,
                    transform: [
                      { rotate: `${Math.min(315, report.formScore * 3.15)}deg` },
                    ],
                  },
                ]}
              />
              <View style={styles.scoreInner}>
                <Text style={styles.scoreValue}>{report.formScore}</Text>
                <TechLabel style={styles.scoreLabel}>动作分</TechLabel>
              </View>
            </View>
          </View>

          <View style={styles.scoreCopy}>
            <Text style={styles.scoreTitle}>{summary.title}</Text>
            <Text style={styles.scoreBody}>{summary.body}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.metricBadge}>
                <Text style={styles.metricBadgeText}>时长: 45M</Text>
              </View>
              <View style={styles.metricBadge}>
                <Text style={styles.metricBadgeText}>强度: 高</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.correctionCard}>
          <View style={styles.cardTop}>
            <TechLabel>动作纠正</TechLabel>
            <Text style={styles.cardIcon}>调</Text>
          </View>
          <View style={styles.correctionCountRow}>
            <Text style={styles.correctionCount}>{report.correctionCount}</Text>
            <Text style={styles.correctionUnit}>次纠正</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, report.correctionCount * 15 + 15)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressNote}>比上次减少 15%</Text>
        </View>

        <View style={[styles.infoCard, styles.riskCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.warningDot}>
              <Text style={styles.warningDotText}>!</Text>
            </View>
            <TechLabel style={styles.riskLabel}>风险提示</TechLabel>
          </View>
          {report.riskNotes.map((note, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listIcon}>{idx === 0 ? "腰" : "膝"}</Text>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>
                  {idx === 0 ? "注意您的腰部" : "膝盖轨迹"}
                </Text>
                <Text style={styles.listText}>{note}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.focusDot}>
              <Text style={styles.focusDotText}>◎</Text>
            </View>
            <TechLabel style={styles.focusLabel}>下次重点</TechLabel>
          </View>
          <View style={styles.focusGrid}>
            <View style={styles.focusTile}>
              <Text style={styles.focusIcon}>伸</Text>
              <Text style={styles.focusTitle}>髋关节灵活性</Text>
              <Text style={styles.focusText}>{focusItems[0]}</Text>
            </View>
            <View style={styles.focusTile}>
              <Text style={styles.focusIcon}>速</Text>
              <Text style={styles.focusTitle}>离心控制</Text>
              <Text style={styles.focusText}>{focusItems[1]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.primaryButton}
            onPress={goHome}
          >
            <Text style={styles.primaryButtonText}>返回首页</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.82} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>分享报告</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>本报告仅供参考，不构成医疗建议。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: aura.colors.background,
  },
  header: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderBottomColor: "rgba(255, 255, 255, 0.7)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 20,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: aura.colors.glassInput,
    borderRadius: aura.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
    lineHeight: 28,
  },
  brandTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 28,
    fontWeight: "900",
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    padding: 20,
    paddingBottom: 38,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 18,
    marginTop: 6,
  },
  h1: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 10,
  },
  subtitle: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 32,
    borderWidth: 1,
    gap: 22,
    padding: 24,
    shadowColor: aura.colors.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 4,
  },
  scoreRing: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingTrack: {
    alignItems: "center",
    borderColor: "rgba(224, 227, 230, 0.82)",
    borderRadius: 112,
    borderWidth: 7,
    height: 216,
    justifyContent: "center",
    width: 216,
  },
  scoreRingFill: {
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    borderRadius: 112,
    borderWidth: 8,
    height: 216,
    position: "absolute",
    width: 216,
  },
  scoreInner: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.68)",
    borderRadius: 78,
    height: 156,
    justifyContent: "center",
    width: 156,
  },
  scoreValue: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 70,
  },
  scoreLabel: {
    marginTop: 8,
  },
  scoreCopy: {
    alignItems: "center",
  },
  scoreTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 20,
    fontWeight: "900",
  },
  scoreBody: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  metricBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  metricBadgeText: {
    color: aura.colors.ink,
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  correctionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 32,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardIcon: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 18,
  },
  correctionCountRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 6,
    marginTop: 28,
  },
  correctionCount: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 54,
  },
  correctionUnit: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 14,
  },
  progressTrack: {
    backgroundColor: "rgba(224, 227, 230, 0.72)",
    borderRadius: aura.radius.pill,
    height: 6,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: aura.colors.ink,
    borderRadius: aura.radius.pill,
    height: "100%",
  },
  progressNote: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.mono,
    fontSize: 10,
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 32,
    borderWidth: 1,
    marginTop: 16,
    overflow: "hidden",
    padding: 20,
  },
  riskCard: {
    borderLeftColor: "#ba1a1a",
    borderLeftWidth: 4,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  warningDot: {
    alignItems: "center",
    backgroundColor: "rgba(255, 218, 214, 0.72)",
    borderColor: "rgba(186, 26, 26, 0.18)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  warningDotText: {
    color: "#ba1a1a",
    fontFamily: aura.font.uiHeavy,
    fontSize: 17,
    fontWeight: "900",
  },
  riskLabel: {
    color: "#ba1a1a",
  },
  focusDot: {
    alignItems: "center",
    backgroundColor: "rgba(217, 226, 255, 0.48)",
    borderColor: "rgba(0, 86, 196, 0.18)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  focusDotText: {
    color: aura.colors.blue,
    fontFamily: aura.font.uiHeavy,
    fontSize: 18,
  },
  focusLabel: {
    color: aura.colors.blue,
  },
  listItem: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 14,
  },
  listIcon: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 20,
    minWidth: 24,
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "900",
  },
  listText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  focusGrid: {
    flexDirection: "row",
    gap: 10,
  },
  focusTile: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 126,
    padding: 14,
  },
  focusIcon: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 22,
    marginBottom: 8,
  },
  focusTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "900",
  },
  focusText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  actions: {
    gap: 10,
    marginTop: 30,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: aura.colors.ink,
    borderRadius: aura.radius.pill,
    justifyContent: "center",
    minHeight: 56,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 5,
  },
  primaryButtonText: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "900",
  },
  shareButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  shareButtonText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "900",
  },
  disclaimer: {
    color: aura.colors.inkMuted,
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
  emptyBrand: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 28,
    fontWeight: "900",
  },
  emptyTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 22,
  },
  emptyText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
    marginTop: 10,
    textAlign: "center",
  },
});
