import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSettings } from "../store/settings";
import { Card } from "../ui/components";
import { colors, font, spacing } from "../ui/theme";

export default function SettingsScreen() {
  const {
    voiceEnabled,
    setVoiceEnabled,
    repAnnouncementsEnabled,
    setRepAnnouncementsEnabled,
    encouragementEnabled,
    setEncouragementEnabled,
  } = useSettings();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>通用设置</Text>

        <Card style={styles.group}>
          <ToggleRow label="语音播报" value={voiceEnabled} onChange={setVoiceEnabled} />
          <View style={styles.divider} />
          <ToggleRow
            label="次数播报"
            value={repAnnouncementsEnabled}
            onChange={setRepAnnouncementsEnabled}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="鼓励打气"
            value={encouragementEnabled}
            onChange={setEncouragementEnabled}
          />
        </Card>

        <Text style={styles.note}>
          开启后，训练中会进行次数播报、姿态纠错和阶段性鼓励提示。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(8) },
  title: {
    fontSize: font.h1,
    fontWeight: "900",
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(6),
  },
  group: { padding: 0, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
  },
  rowLabel: { fontSize: font.h3, fontWeight: "600", color: colors.text },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: spacing(4) },
  note: {
    marginTop: spacing(6),
    color: colors.textFaint,
    fontSize: font.small,
    textAlign: "center",
    lineHeight: 20,
  },
});
