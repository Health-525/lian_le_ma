/**
 * 评估页：采集训练目标 / 场地 / 器械 / 每周频率 / 伤痛风险，
 * 提交后本地生成 7 天计划并跳转计划页（需求 1 / 2）。
 */
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppStore } from "../store/useAppStore";
import type {
  Equipment,
  InjuryRiskArea,
  TrainingGoal,
  Venue,
} from "../types";
import type { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Assessment">;

const GOALS: { value: TrainingGoal; label: string }[] = [
  { value: "fat_loss", label: "减脂" },
  { value: "muscle_gain", label: "增肌" },
  { value: "endurance", label: "耐力" },
  { value: "general_fitness", label: "综合体能" },
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

function Chip({
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

  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>(["none"]);
  const [frequency, setFrequency] = useState<number | null>(3);
  const [injuries, setInjuries] = useState<InjuryRiskArea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (e: Equipment) =>
    setEquipment((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>运动评估</Text>
      <Text style={styles.hint}>用一分钟告诉教练你的情况</Text>

      <Text style={styles.section}>训练目标 *</Text>
      <View style={styles.row}>
        {GOALS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={goal === g.value}
            onPress={() => setGoal(g.value)}
          />
        ))}
      </View>

      <Text style={styles.section}>训练场地 *</Text>
      <View style={styles.row}>
        {VENUES.map((v) => (
          <Chip
            key={v.value}
            label={v.label}
            selected={venue === v.value}
            onPress={() => setVenue(v.value)}
          />
        ))}
      </View>

      <Text style={styles.section}>可用器械（可多选）</Text>
      <View style={styles.row}>
        {EQUIPMENTS.map((e) => (
          <Chip
            key={e.value}
            label={e.label}
            selected={equipment.includes(e.value)}
            onPress={() => toggleEquipment(e.value)}
          />
        ))}
      </View>

      <Text style={styles.section}>每周训练频率 *</Text>
      <View style={styles.row}>
        {FREQUENCIES.map((f) => (
          <Chip
            key={f}
            label={`${f} 天`}
            selected={frequency === f}
            onPress={() => setFrequency(f)}
          />
        ))}
      </View>

      <Text style={styles.section}>伤痛风险自评（可多选）</Text>
      <Text style={styles.consent}>
        以下属敏感健康信息，仅用于规避相关动作，可不填。
      </Text>
      <View style={styles.row}>
        {INJURIES.map((i) => (
          <Chip
            key={i.value}
            label={i.label}
            selected={injuries.includes(i.value)}
            onPress={() => toggleInjury(i.value)}
          />
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
        <Text style={styles.primaryBtnText}>生成我的 7 天计划</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  h1: { fontSize: 28, fontWeight: "700", marginTop: 8 },
  hint: { color: "#888", marginTop: 4, marginBottom: 8 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 22, marginBottom: 8 },
  consent: { color: "#b26a00", fontSize: 12, marginBottom: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fafafa",
  },
  chipSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#333" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 16 },
  primaryBtn: {
    marginTop: 28,
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
