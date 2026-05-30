import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProfileStackParamList } from "../navigation";
import { GENDER_LABEL, bmiLevel, calcBmi, useSettings } from "../store/settings";
import { Card } from "../ui/components";
import { colors, font, radius, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { voice, profile } = useSettings();
  const bmi = calcBmi(profile.heightCm, profile.weightKg);

  const subtitle =
    [
      profile.gender !== "unset" ? GENDER_LABEL[profile.gender] : null,
      profile.age ? `${profile.age} 岁` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "补充资料后可获得更准确的健身方案与热量评估";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>我的</Text>

        <Card style={styles.userCard} onPress={() => navigation.navigate("EditProfile")}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.trim().slice(0, 1) || "练"}</Text>
          </View>
          <View style={styles.userBody}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Text style={styles.link}>编辑</Text>
        </Card>

        <Text style={styles.sectionTitle}>身体数据</Text>
        <View style={styles.stats}>
          <Stat label="身高" value={profile.heightCm ? String(profile.heightCm) : "—"} unit="cm" />
          <View style={styles.divider} />
          <Stat label="体重" value={profile.weightKg ? String(profile.weightKg) : "—"} unit="kg" />
          <View style={styles.divider} />
          <Stat label={`BMI · ${bmiLevel(bmi)}`} value={bmi !== null ? String(bmi) : "—"} unit="" />
        </View>

        <Text style={styles.sectionTitle}>功能设置</Text>
        <Card style={styles.menu}>
          <Row label="个人资料" value="" onPress={() => navigation.navigate("EditProfile")} />
          <View style={styles.rowDivider} />
          <Row label="语音教练" value={voice.name} onPress={() => navigation.navigate("Voice")} />
          <View style={styles.rowDivider} />
          <Row label="通用设置" value="" onPress={() => navigation.navigate("Settings")} />
        </Card>

        <Text style={styles.version}>练了吗 · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.rowCard} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowSpacer} />
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(8) },
  title: {
    fontSize: font.display,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
    marginTop: spacing(2),
    marginBottom: spacing(5),
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(4),
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.onAccent, fontSize: 24, fontWeight: "900" },
  userBody: { flex: 1 },
  name: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textMuted, marginTop: spacing(1) },
  link: { fontSize: font.small, fontWeight: "700", color: colors.accentDeep },
  sectionTitle: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textFaint,
    letterSpacing: 0.5,
    marginTop: spacing(7),
    marginBottom: spacing(3),
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(4),
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: font.h1, fontWeight: "900", color: colors.text },
  statUnit: { fontSize: font.small, fontWeight: "600", color: colors.textFaint },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing(1) },
  divider: { width: 1, height: 32, backgroundColor: colors.border },
  menu: { padding: 0, gap: 0, overflow: "hidden" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  rowLabel: { fontSize: font.h3, fontWeight: "600", color: colors.text },
  rowSpacer: { flex: 1 },
  rowValue: { fontSize: font.body, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textFaint, fontWeight: "300" },
  rowDivider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: spacing(4) },
  version: {
    textAlign: "center",
    color: colors.textFaint,
    fontSize: font.tiny,
    marginTop: spacing(8),
  },
});
