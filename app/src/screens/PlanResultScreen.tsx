import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomizationStackParamList } from "../navigation";
import { EXERCISE_LABEL } from "../types";
import { Card, Pill } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<CustomizationStackParamList, "PlanResult">;

export default function PlanResultScreen({ route }: Props) {
  const { result } = route.params;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>7 天专属方案</Text>
        <Text style={styles.subtitle}>
          已根据你的身体数据、训练目标和近期负重，生成训练计划、饮食建议和安全负重范围。
        </Text>

        <Card>
          <Text style={styles.sectionTitle}>安全提醒</Text>
          {(result.safety_notes.length ? result.safety_notes : ["当前无额外风险提醒。"]).map(
            (note) => (
              <Text key={note} style={styles.bodyText}>
                • {note}
              </Text>
            )
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>训练安排</Text>
          {result.training_plan.days.map((day) => (
            <View key={day.day_index} style={styles.block}>
              <Text style={styles.dayTitle}>
                第 {day.day_index} 天{day.is_rest_day ? " · 恢复日" : ""}
              </Text>
              {day.exercises.length ? (
                day.exercises.map((exercise, index) => (
                  <Text key={`${day.day_index}-${index}`} style={styles.bodyText}>
                    {exercise.name} · {exercise.sets} 组 ·{" "}
                    {exercise.reps ? `${exercise.reps} 次` : `${exercise.duration_sec ?? 0} 秒`} ·
                    休息 {exercise.rest_sec} 秒
                  </Text>
                ))
              ) : (
                <Text style={styles.bodyText}>当天以恢复和拉伸为主。</Text>
              )}
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>饮食规划</Text>
          <Text style={styles.bodyText}>{result.meal_plan.hydration_note}</Text>
          {result.meal_plan.days.map((day) => (
            <View key={`meal-${day.day_index}`} style={styles.block}>
              <Text style={styles.dayTitle}>
                第 {day.day_index} 天 · {day.calorie_target} kcal
              </Text>
              <Text style={styles.bodyText}>
                蛋白质 {day.protein_g}g · 碳水 {day.carbs_g}g · 脂肪 {day.fat_g}g
              </Text>
              {day.meal_suggestions.map((item) => (
                <Text key={`${day.day_index}-${item}`} style={styles.bodyText}>
                  • {item}
                </Text>
              ))}
            </View>
          ))}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>不可尝试的最大重量</Text>
          {result.attempt_guidance.map((item) => (
            <View key={item.exercise} style={styles.block}>
              <View style={styles.row}>
                <Text style={styles.dayTitle}>{EXERCISE_LABEL[item.exercise]}</Text>
                <Pill text={item.confidence_label} color={colors.accentDeep} tint={colors.accentSoft} />
              </View>
              <Text style={styles.bodyText}>
                估算训练上限：{item.estimated_training_max_kg ?? "—"} kg
              </Text>
              <Text style={styles.bodyText}>
                建议不要超过：{item.do_not_exceed_kg ?? "—"} kg
              </Text>
              <Text style={styles.bodyText}>{item.explanation_note}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(10), gap: spacing(4) },
  title: { fontSize: font.display, fontWeight: "900", color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted, lineHeight: 22 },
  sectionTitle: {
    fontSize: font.h2,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing(2),
  },
  dayTitle: { fontSize: font.body, fontWeight: "700", color: colors.text },
  bodyText: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
  block: { gap: spacing(1), paddingTop: spacing(2) },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
