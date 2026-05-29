/**
 * 计划页：按 7 天展示训练计划，进入训练页（需求 2.9）。
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

type Props = NativeStackScreenProps<RootStackParamList, "Plan">;

const WEEKDAYS = ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天", "第7天"];

export default function PlanScreen({ navigation }: Props) {
  const plan = useAppStore((s) => s.plan);

  if (!plan) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <LogoMark size={42} inverted />
          <Text style={styles.emptyTitle}>计划未初始化</Text>
          <Text style={styles.emptyText}>请先完成评估，系统会生成 7 天训练计划。</Text>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.lightBtn}
            onPress={() => navigation.navigate("Assessment")}
          >
            <Text style={styles.lightBtnText}>返回评估</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trainingDays = plan.days.filter((day) => !day.isRestDay).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LogoMark size={32} inverted />
          <View style={styles.headerCopy}>
            <TechLabel light>SYS_PLAN_READY</TechLabel>
            <Text style={styles.h1}>我的 7 天计划</Text>
            <Text style={styles.subtitle}>
              {trainingDays} 个训练日已排布，动作强度依据评估参数生成。
            </Text>
          </View>
        </View>

        <View style={styles.overviewCard}>
          <View>
            <Text style={styles.overviewValue}>{trainingDays}</Text>
            <Text style={styles.overviewLabel}>TRAINING DAYS</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View>
            <Text style={styles.overviewValue}>7</Text>
            <Text style={styles.overviewLabel}>DAY PROGRAM</Text>
          </View>
        </View>

        {plan.days.map((day) => (
          <View key={day.dayIndex} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View>
                <TechLabel>{`DAY_${String(day.dayIndex).padStart(2, "0")}`}</TechLabel>
                <Text style={styles.dayTitle}>{WEEKDAYS[day.dayIndex - 1]}</Text>
              </View>
              <PillBadge active={!day.isRestDay}>
                {day.isRestDay ? "RECOVERY" : "TRAIN"}
              </PillBadge>
            </View>

            {day.isRestDay ? (
              <Text style={styles.restText}>主动恢复 / 拉伸 / 低强度步行</Text>
            ) : (
              day.exercises.map((ex, idx) => (
                <View key={`${day.dayIndex}-${idx}`} style={styles.exRow}>
                  <View style={styles.exIndex}>
                    <Text style={styles.exIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.exCopy}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exMeta}>
                      {ex.sets} 组 x {ex.reps} 次 · 休息 {ex.restSec}s · 难度{" "}
                      {ex.difficulty}
                    </Text>
                  </View>
                  {ex.exercise && <PillBadge>CAM</PillBadge>}
                </View>
              ))
            )}
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.lightBtn}
          onPress={() => navigation.navigate("Training")}
        >
          <Text style={styles.lightBtnText}>开始训练</Text>
        </TouchableOpacity>
        <Text style={styles.note}>CAM 标记的动作支持摄像头动作纠错。</Text>
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
  overviewCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: aura.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
    minHeight: 92,
    padding: 16,
  },
  overviewValue: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  overviewLabel: {
    color: "rgba(255, 255, 255, 0.45)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 4,
    textAlign: "center",
  },
  overviewDivider: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    height: 48,
    width: 1,
  },
  dayCard: {
    backgroundColor: aura.colors.surfaceSoft,
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: aura.radius.md,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: aura.colors.blueSoft,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  dayHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dayTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  restText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 24,
  },
  exRow: {
    alignItems: "center",
    borderTopColor: "rgba(5, 6, 8, 0.06)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingVertical: 10,
  },
  exIndex: {
    alignItems: "center",
    backgroundColor: aura.colors.glassInput,
    borderRadius: aura.radius.pill,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  exIndexText: {
    color: aura.colors.ink,
    fontFamily: aura.font.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  exCopy: {
    flex: 1,
    minWidth: 0,
  },
  exName: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "800",
  },
  exMeta: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  lightBtn: {
    alignItems: "center",
    backgroundColor: aura.colors.surface,
    borderRadius: aura.radius.pill,
    justifyContent: "center",
    marginTop: 12,
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
  note: {
    color: aura.colors.darkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
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
