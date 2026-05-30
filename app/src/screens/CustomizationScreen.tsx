import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { generateCustomPlan, isBackendConfigured, upsertProfile } from "../api/client";
import type { CustomizationStackParamList } from "../navigation";
import { EXERCISE_LABEL, type SupportedExercise } from "../types";
import {
  GENDER_LABEL,
  useSettings,
  type Gender,
  type UserProfile,
} from "../store/settings";
import { PrimaryButton } from "../ui/components";
import { colors, font, radius, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<CustomizationStackParamList, "CustomForm">;

const GOALS = [
  { id: "fat_loss", label: "减脂" },
  { id: "muscle_gain", label: "增肌" },
  { id: "endurance", label: "耐力" },
  { id: "general_fitness", label: "综合健身" },
] as const;

const VENUES = [
  { id: "home", label: "居家" },
  { id: "gym", label: "健身房" },
  { id: "outdoor", label: "户外" },
] as const;

const RISKS = ["shoulder", "lower_back", "knee", "wrist", "neck"] as const;

const EXERCISE_OPTIONS: SupportedExercise[] = [
  "squat",
  "lunge",
  "push_up",
  "dumbbell_shoulder_press",
  "dumbbell_rows",
  "bicep_curls",
  "situps",
  "tricep_extensions",
  "lateral_shoulder_raises",
  "jumping_jacks",
];

const num = (value: string): number | null => {
  const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function CustomizationScreen({ navigation }: Props) {
  const { profile, setProfile } = useSettings();

  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : "");

  const [goal, setGoal] = useState<(typeof GOALS)[number]["id"]>("general_fitness");
  const [venue, setVenue] = useState<(typeof VENUES)[number]["id"]>("home");
  const [frequency, setFrequency] = useState("3");
  const [equipment, setEquipment] = useState("哑铃, 瑜伽垫");
  const [injuryRisk, setInjuryRisk] = useState<string[]>([]);
  const [sampleExercise, setSampleExercise] = useState<SupportedExercise>("squat");
  const [sampleWeight, setSampleWeight] = useState("");
  const [sampleReps, setSampleReps] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRisk = (risk: string) => {
    setInjuryRisk((current) =>
      current.includes(risk) ? current.filter((item) => item !== risk) : [...current, risk]
    );
  };

  const submit = async () => {
    if (!isBackendConfigured()) {
      setError("请先通过启动脚本启动后端，再生成个性化方案。");
      return;
    }

    setLoading(true);
    setError(null);

    const draftProfile: UserProfile = {
      userId: profile.userId,
      name: name.trim() || "练了吗用户",
      gender,
      age: num(age),
      heightCm: num(height),
      weightKg: num(weight),
    };

    try {
      const savedProfile = await upsertProfile(draftProfile);
      setProfile(savedProfile);
      const result = await generateCustomPlan({
        profile: {
          user_id: savedProfile.userId,
          name: savedProfile.name,
          gender: savedProfile.gender,
          age: savedProfile.age,
          height_cm: savedProfile.heightCm,
          weight_kg: savedProfile.weightKg,
        },
        assessment: {
          user_id: savedProfile.userId,
          goal,
          venue,
          equipment: equipment
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          weekly_frequency: Math.max(1, Math.min(7, num(frequency) ?? 3)),
          injury_risk: injuryRisk,
        },
        recent_load_samples:
          num(sampleWeight) && num(sampleReps)
            ? [
                {
                  exercise: sampleExercise,
                  weight_kg: num(sampleWeight)!,
                  reps_completed: num(sampleReps)!,
                },
              ]
            : [],
      });
      navigation.navigate("PlanResult", { result });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成方案失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>个性定制</Text>
        <Text style={styles.subtitle}>
          输入身高体重、训练目标和近期负重数据，生成 7 天健身计划、饮食规划和保守最大尝试重量。
        </Text>

        <Field label="基本资料">
          <View style={styles.formGrid}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="昵称"
              placeholderTextColor={colors.textFaint}
            />
            <View style={styles.segment}>
              {(["male", "female", "unset"] as Gender[]).map((item) => {
                const active = gender === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setGender(item)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {GENDER_LABEL[item]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.dualRow}>
              <MetricInput
                value={age}
                onChangeText={setAge}
                placeholder="年龄"
                unit="岁"
              />
              <MetricInput
                value={height}
                onChangeText={setHeight}
                placeholder="身高"
                unit="cm"
              />
            </View>
            <MetricInput
              value={weight}
              onChangeText={setWeight}
              placeholder="体重"
              unit="kg"
            />
          </View>
        </Field>

        <Field label="训练目标">
          <RowChoice
            items={GOALS.map((item) => item.id)}
            labels={Object.fromEntries(GOALS.map((item) => [item.id, item.label]))}
            value={goal}
            onChange={(value) => setGoal(value as typeof goal)}
          />
        </Field>

        <Field label="训练场景">
          <RowChoice
            items={VENUES.map((item) => item.id)}
            labels={Object.fromEntries(VENUES.map((item) => [item.id, item.label]))}
            value={venue}
            onChange={(value) => setVenue(value as typeof venue)}
          />
        </Field>

        <Field label="每周训练频次">
          <TextInput
            style={styles.input}
            value={frequency}
            onChangeText={(text) => setFrequency(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="例如 3"
            placeholderTextColor={colors.textFaint}
          />
        </Field>

        <Field label="现有器械">
          <TextInput
            style={styles.input}
            value={equipment}
            onChangeText={setEquipment}
            placeholder="例如 哑铃, 瑜伽垫, 弹力带"
            placeholderTextColor={colors.textFaint}
          />
        </Field>

        <Field label="风险部位">
          <View style={styles.wrap}>
            {RISKS.map((risk) => {
              const active = injuryRisk.includes(risk);
              return (
                <Pressable
                  key={risk}
                  onPress={() => toggleRisk(risk)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{risk}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="近期负重参考">
          <RowChoice
            items={EXERCISE_OPTIONS}
            labels={Object.fromEntries(
              EXERCISE_OPTIONS.map((item) => [item, EXERCISE_LABEL[item]])
            )}
            value={sampleExercise}
            onChange={(value) => setSampleExercise(value as SupportedExercise)}
            compact
          />
          <View style={styles.dualRow}>
            <MetricInput
              value={sampleWeight}
              onChangeText={setSampleWeight}
              placeholder="重量"
              unit="kg"
            />
            <MetricInput
              value={sampleReps}
              onChangeText={setSampleReps}
              placeholder="次数"
              unit="次"
            />
          </View>
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="生成 7 天方案"
          onPress={() => void submit()}
          loading={loading}
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function RowChoice({
  items,
  labels,
  value,
  onChange,
  compact,
}: {
  items: readonly string[];
  labels: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      {items.map((item) => {
        const active = item === value;
        return (
          <Pressable
            key={item}
            onPress={() => onChange(item)}
            style={[styles.tag, active && styles.tagActive]}
          >
            <Text style={[styles.tagText, active && styles.tagTextActive]}>
              {labels[item] || item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MetricInput({
  value,
  onChangeText,
  placeholder,
  unit,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  unit: string;
}) {
  return (
    <View style={styles.metricInput}>
      <TextInput
        style={styles.metricText}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
      />
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(8), gap: spacing(4) },
  title: { fontSize: font.display, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
  field: { gap: spacing(2) },
  label: { fontSize: font.small, fontWeight: "700", color: colors.textMuted },
  formGrid: { gap: spacing(3) },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    fontSize: font.body,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing(1),
    gap: spacing(1),
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing(3),
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentItemActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textMuted, fontWeight: "700", fontSize: font.body },
  segmentTextActive: { color: colors.onAccent },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  compactWrap: { maxHeight: 168 },
  tag: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tagText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  tagTextActive: { color: colors.onAccent },
  dualRow: { flexDirection: "row", gap: spacing(2) },
  metricInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
  },
  metricText: {
    flex: 1,
    color: colors.text,
    fontSize: font.body,
    paddingVertical: spacing(3.5),
  },
  metricUnit: { color: colors.textFaint, fontWeight: "700", fontSize: font.small },
  error: { color: "#B42318", fontSize: font.small, fontWeight: "600" },
});
