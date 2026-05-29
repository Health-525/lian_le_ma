/**
 * 评估页：按 Stitch 的 Aura Lumina 视觉方向重做首屏，同时保留本地计划生成流程。
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

import { LogoMark, PillBadge, TechLabel, aura } from "../ui/aura";
import { useAppStore } from "../store/useAppStore";
import type {
  Equipment,
  InjuryRiskArea,
  TrainingGoal,
  Venue,
} from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Assessment">;

const GOALS: {
  value: TrainingGoal;
  label: string;
  description: string;
  code: string;
}[] = [
  {
    value: "fat_loss",
    label: "减脂",
    description: "最大限度燃烧热量并改善心血管健康。",
    code: "CUT",
  },
  {
    value: "muscle_gain",
    label: "增肌",
    description: "专注于肌肉肥大的训练，以增加围度和力量。",
    code: "BUILD",
  },
  {
    value: "general_fitness",
    label: "大众健康",
    description: "灵活度、力量和耐力的平衡方法。",
    code: "BASE",
  },
  {
    value: "endurance",
    label: "柔韧性",
    description: "专注于关节活动度、健康与恢复。",
    code: "MOBILITY",
  },
];

const VENUES: { value: Venue; label: string }[] = [
  { value: "home", label: "居家" },
  { value: "gym", label: "健身房" },
  { value: "outdoor", label: "户外" },
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

function GoalCard({
  label,
  description,
  code,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  code: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.goalCard, selected && styles.goalCardSelected]}
      onPress={onPress}
    >
      <View style={styles.goalTop}>
        <LogoMark size={32} />
        <PillBadge active={selected}>{code}</PillBadge>
      </View>
      <Text style={styles.goalTitle}>{label}</Text>
      <Text style={styles.goalDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export default function AssessmentScreen({ navigation }: Props) {
  const submitAssessment = useAppStore((s) => s.submitAssessment);

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

  const onSubmit = () => {
    if (!goal || !venue || !frequency) {
      setError("请完成必填项：训练目标、训练场地、每周频率。");
      return;
    }
    setError(null);
    submitAssessment({
      goal,
      venue,
      equipment: equipment.length > 0 ? equipment : ["none"],
      weeklyFrequency: frequency,
      injuryRisk: injuries,
    });
    navigation.navigate("Plan");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.brandBar}>
        <LogoMark size={28} />
        <Text style={styles.brandTitle}>练了吗</Text>
        <View style={styles.brandSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <TechLabel light style={styles.heroCode}>
            SYS_INIT_ASSESSMENT
          </TechLabel>
          <Text style={styles.heroTitle}>根据您的预期目标校准计划参数。</Text>
          <Text style={styles.heroText}>
            选择主目标后，系统会结合训练场地、器械和恢复风险生成 7 天计划。
          </Text>
        </View>

        <View style={styles.goalList}>
          {GOALS.map((g) => (
            <GoalCard
              key={g.value}
              label={g.label}
              description={g.description}
              code={g.code}
              selected={goal === g.value}
              onPress={() => setGoal(g.value)}
            />
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <TechLabel>PLAN_INPUTS</TechLabel>
              <Text style={styles.panelTitle}>训练参数</Text>
            </View>
            <PillBadge>{frequency}D/WEEK</PillBadge>
          </View>

          <Text style={styles.section}>训练场地</Text>
          <View style={styles.row}>
            {VENUES.map((v) => (
              <ChoiceChip
                key={v.value}
                label={v.label}
                selected={venue === v.value}
                onPress={() => setVenue(v.value)}
              />
            ))}
          </View>

          <Text style={styles.section}>每周频率</Text>
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

          <Text style={styles.section}>可用器械</Text>
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

          <Text style={styles.section}>伤痛风险自评</Text>
          <Text style={styles.consent}>
            可跳过。该信息只用于规避相关动作，不构成医疗建议。
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

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.primaryBtn}
            onPress={onSubmit}
          >
            <Text style={styles.primaryBtnText}>生成我的 7 天计划</Text>
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
  brandBar: {
    alignItems: "center",
    backgroundColor: aura.colors.background,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 70,
    paddingHorizontal: 20,
  },
  brandTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
  },
  brandSpacer: {
    width: 28,
  },
  body: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    paddingBottom: 28,
  },
  hero: {
    alignItems: "center",
    minHeight: 232,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  heroCode: {
    marginBottom: 72,
  },
  heroTitle: {
    color: "rgba(255, 255, 255, 0.36)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
  },
  heroText: {
    color: "rgba(255, 255, 255, 0.42)",
    fontFamily: aura.font.ui,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 340,
    textAlign: "center",
  },
  goalList: {
    gap: 14,
    marginTop: -38,
    paddingHorizontal: 16,
  },
  goalCard: {
    backgroundColor: aura.colors.surfaceSoft,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: aura.radius.lg,
    borderWidth: 1,
    minHeight: 138,
    overflow: "hidden",
    padding: 22,
    shadowColor: aura.colors.blueSoft,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 4,
  },
  goalCardSelected: {
    borderColor: "rgba(42, 111, 229, 0.26)",
    shadowColor: aura.colors.blue,
    shadowOpacity: 0.34,
  },
  goalTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  goalTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
  },
  goalDescription: {
    color: "rgba(5, 6, 8, 0.56)",
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
    marginTop: 6,
  },
  panel: {
    backgroundColor: aura.colors.surfaceSoft,
    borderRadius: aura.radius.lg,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  panelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 8,
  },
  panelTitle: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  section: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 9,
    marginTop: 18,
  },
  consent: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.ui,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
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
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: aura.colors.ink,
    borderRadius: aura.radius.pill,
    marginTop: 22,
    minHeight: 52,
    justifyContent: "center",
    shadowColor: aura.colors.blue,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 5,
  },
  primaryBtnText: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
    fontWeight: "800",
  },
});
