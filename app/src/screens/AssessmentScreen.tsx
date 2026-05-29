/**
 * 新用户运动评估：三步式 Aura glass UI，保留本地计划生成流程。
 */
import { useState } from "react";
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
import type {
  Equipment,
  InjuryRiskArea,
  TrainingGoal,
  Venue,
} from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Assessment">;

const STEPS = ["目标", "参数", "恢复"];

const GOALS: {
  value: TrainingGoal;
  label: string;
  description: string;
  glyph: string;
}[] = [
  {
    value: "fat_loss",
    label: "减脂",
    description: "最大化热量消耗并改善心血管健康。",
    glyph: "火",
  },
  {
    value: "muscle_gain",
    label: "增肌",
    description: "专注于肌肥大训练以增加肌肉量和力量。",
    glyph: "力",
  },
  {
    value: "general_fitness",
    label: "大众健康",
    description: "兼顾灵活性、力量和耐力的平衡方法。",
    glyph: "心",
  },
  {
    value: "endurance",
    label: "柔韧性",
    description: "专注于运动范围、关节健康和恢复。",
    glyph: "伸",
  },
];

const VENUES: { value: Venue; label: string; description: string }[] = [
  { value: "home", label: "居家", description: "低器械、低噪音训练。" },
  { value: "gym", label: "健身房", description: "可用完整力量器械。" },
  { value: "outdoor", label: "户外", description: "跑跳和体能训练优先。" },
];

const EQUIPMENTS: { value: Equipment; label: string }[] = [
  { value: "none", label: "徒手" },
  { value: "dumbbell", label: "哑铃" },
  { value: "barbell", label: "杠铃" },
  { value: "resistance_band", label: "弹力带" },
  { value: "bench", label: "训练凳" },
];
const INJURIES: { value: InjuryRiskArea; label: string }[] = [
  { value: "shoulder", label: "肩" },
  { value: "lower_back", label: "腰" },
  { value: "knee", label: "膝" },
  { value: "wrist", label: "腕" },
  { value: "neck", label: "颈" },
];
const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7];

function OptionCard({
  title,
  description,
  glyph,
  selected,
  onPress,
}: {
  title: string;
  description: string;
  glyph: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[styles.optionCard, selected && styles.optionCardActive]}
      onPress={onPress}
    >
      <Text style={styles.cardGlyph}>{glyph}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{description}</Text>
      <View style={[styles.checkMark, selected && styles.checkMarkActive]}>
        <Text style={[styles.checkText, selected && styles.checkTextActive]}>
          {selected ? "✓" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AssessmentScreen({ navigation }: Props) {
  const submitAssessment = useAppStore((s) => s.submitAssessment);
  const reset = useAppStore((s) => s.reset);

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TrainingGoal>("fat_loss");
  const [venue, setVenue] = useState<Venue>("home");
  const [equipment, setEquipment] = useState<Equipment[]>(["none"]);
  const [frequency, setFrequency] = useState(3);
  const [injuries, setInjuries] = useState<InjuryRiskArea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (e: Equipment) =>
    setEquipment((prev) => {
      if (e === "none") return ["none"];
      const withoutNone = prev.filter((x) => x !== "none");
      const next = withoutNone.includes(e)
        ? withoutNone.filter((x) => x !== e)
        : [...withoutNone, e];
      return next.length > 0 ? next : ["none"];
    });
  const toggleInjury = (i: InjuryRiskArea) =>
    setInjuries((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const onClose = () => {
    reset();
    setStep(0);
  };

  const onNext = () => {
    setError(null);
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    submitAssessment({
      goal,
      venue,
      equipment: equipment.length > 0 ? equipment : ["none"],
      weeklyFrequency: frequency,
      injuryRisk: injuries,
    });
    navigation.navigate("Plan");
  };

  const onBack = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="关闭评估"
          activeOpacity={0.82}
          style={styles.iconButton}
          onPress={onClose}
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
        <View style={styles.progressBlock}>
          <TechLabel style={styles.progressCode}>SYS_INIT_ASSESSMENT</TechLabel>
          <View style={styles.progressSegments}>
            {STEPS.map((label, index) => (
              <View
                key={label}
                style={[
                  styles.progressSegment,
                  index <= step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>
            第{step + 1}步 // 共{STEPS.length}步
          </Text>
        </View>

        {step === 0 && (
          <>
            <View style={styles.contentHeader}>
              <Text style={styles.screenTitle}>选择主要目标</Text>
              <Text style={styles.screenSubtitle}>
                根据您的期望目标校准计划参数。
              </Text>
            </View>

            <View style={styles.optionGrid}>
              {GOALS.map((g) => (
                <OptionCard
                  key={g.value}
                  title={g.label}
                  description={g.description}
                  glyph={g.glyph}
                  selected={goal === g.value}
                  onPress={() => setGoal(g.value)}
                />
              ))}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <View style={styles.contentHeader}>
              <Text style={styles.screenTitle}>校准训练参数</Text>
              <Text style={styles.screenSubtitle}>
                场地和频率会决定 7 天计划的训练日与动作强度。
              </Text>
            </View>

            <View style={styles.stack}>
              {VENUES.map((v) => (
                <OptionCard
                  key={v.value}
                  title={v.label}
                  description={v.description}
                  glyph={v.label.slice(0, 1)}
                  selected={venue === v.value}
                  onPress={() => setVenue(v.value)}
                />
              ))}
            </View>

            <View style={styles.panel}>
              <TechLabel>WEEKLY_FREQUENCY</TechLabel>
              <Text style={styles.sectionTitle}>每周训练频率</Text>
              <View style={styles.row}>
                {FREQUENCIES.map((f) => (
                  <ChoiceChip
                    key={f}
                    label={`${f} 天`}
                    selected={frequency === f}
                    onPress={() => setFrequency(f)}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.contentHeader}>
              <Text style={styles.screenTitle}>补充恢复信息</Text>
              <Text style={styles.screenSubtitle}>
                器械用于匹配动作，伤痛风险可跳过，仅用于规避相关动作。
              </Text>
            </View>

            <View style={styles.panel}>
              <TechLabel>AVAILABLE_EQUIPMENT</TechLabel>
              <Text style={styles.sectionTitle}>可用器械</Text>
              <View style={styles.row}>
                {EQUIPMENTS.map((e) => (
                  <ChoiceChip
                    key={e.value}
                    label={e.label}
                    selected={equipment.includes(e.value)}
                    onPress={() => toggleEquipment(e.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <TechLabel>RISK_SELF_CHECK</TechLabel>
              <Text style={styles.sectionTitle}>伤痛风险自评</Text>
              <Text style={styles.consent}>
                该信息只用于规避相关动作，不构成医疗建议。
              </Text>
              <View style={styles.row}>
                {INJURIES.map((i) => (
                  <ChoiceChip
                    key={i.value}
                    label={i.label}
                    selected={injuries.includes(i.value)}
                    onPress={() => toggleInjury(i.value)}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.navigationRow}>
          {step === 0 ? (
            <View style={styles.navSpacer} />
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.secondaryButton}
              onPress={onBack}
            >
              <Text style={styles.secondaryButtonText}>上一步</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.primaryButton}
            onPress={onNext}
          >
            <Text style={styles.primaryButtonText}>
              {step === STEPS.length - 1 ? "生成计划" : "下一步"}
            </Text>
            <Text style={styles.primaryArrow}>→</Text>
          </TouchableOpacity>
        </View>
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
    letterSpacing: 0,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    padding: 20,
    paddingBottom: 34,
  },
  progressBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  progressCode: {
    marginBottom: 12,
  },
  progressSegments: {
    flexDirection: "row",
    gap: 4,
    maxWidth: 360,
    width: "100%",
  },
  progressSegment: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 3,
    flex: 1,
    height: 6,
  },
  progressSegmentActive: {
    backgroundColor: aura.colors.ink,
    shadowColor: aura.colors.ink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  progressText: {
    color: "rgba(5, 6, 8, 0.48)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    marginTop: 10,
  },
  contentHeader: {
    alignItems: "center",
    marginBottom: 22,
  },
  screenTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
    textAlign: "center",
  },
  screenSubtitle: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  optionGrid: {
    gap: 14,
  },
  stack: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 150,
    overflow: "hidden",
    padding: 22,
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  optionCardActive: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: aura.colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    transform: [{ translateY: -2 }],
  },
  cardGlyph: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 35,
    fontWeight: "900",
    lineHeight: 44,
    marginBottom: 12,
  },
  cardTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 17,
    fontWeight: "900",
  },
  cardText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  checkMark: {
    alignItems: "center",
    borderColor: "rgba(5, 6, 8, 0.18)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 16,
    width: 24,
  },
  checkMarkActive: {
    backgroundColor: aura.colors.ink,
    borderColor: aura.colors.ink,
  },
  checkText: {
    color: "transparent",
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "900",
  },
  checkTextActive: {
    color: aura.colors.surface,
  },
  panel: {
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  sectionTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
    marginBottom: 12,
  },
  consent: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  chip: {
    backgroundColor: aura.colors.glassInput,
    borderRadius: aura.radius.pill,
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  chipSelected: {
    backgroundColor: aura.colors.ink,
  },
  chipText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: aura.colors.surface,
  },
  error: {
    color: "#ba1a1a",
    fontFamily: aura.font.uiHeavy,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 18,
    textAlign: "center",
  },
  navigationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 36,
  },
  navSpacer: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: aura.colors.ink,
    borderRadius: aura.radius.pill,
    flex: 2,
    flexDirection: "row",
    gap: 8,
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
  primaryArrow: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 20,
    fontWeight: "900",
  },
});
