import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ProfileStackParamList } from "../navigation";
import { GENDER_LABEL, useSettings, type Gender, type UserProfile } from "../store/settings";
import { PrimaryButton } from "../ui/components";
import { lightHaptic } from "../ui/haptics";
import { colors, font, radius, spacing } from "../ui/theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "EditProfile">;

const toNum = (value: string): number | null => {
  const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function EditProfileScreen({ navigation }: Props) {
  const { profile, setProfile } = useSettings();
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : "");

  const save = () => {
    const next: UserProfile = {
      userId: profile.userId,
      name: name.trim() || "练了吗用户",
      gender,
      age: toNum(age),
      heightCm: toNum(height),
      weightKg: toNum(weight),
    };
    setProfile(next);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="昵称">
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="请输入昵称"
            placeholderTextColor={colors.textFaint}
            maxLength={16}
          />
        </Field>

        <Field label="性别">
          <View style={styles.segment}>
            {(["male", "female", "unset"] as Gender[]).map((item) => {
              const active = gender === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => {
                    lightHaptic();
                    setGender(item);
                  }}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {GENDER_LABEL[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="年龄">
          <UnitInput value={age} onChangeText={setAge} unit="岁" placeholder="例如 25" />
        </Field>
        <Field label="身高">
          <UnitInput value={height} onChangeText={setHeight} unit="cm" placeholder="例如 175" />
        </Field>
        <Field label="体重">
          <UnitInput value={weight} onChangeText={setWeight} unit="kg" placeholder="例如 65" />
        </Field>

        <PrimaryButton label="保存资料" onPress={save} style={{ marginTop: spacing(6) }} />
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

function UnitInput({
  value,
  onChangeText,
  unit,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  unit: string;
  placeholder: string;
}) {
  return (
    <View style={styles.unitWrap}>
      <TextInput
        style={styles.unitInput}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        maxLength={3}
      />
      <Text style={styles.unitText}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing(5), paddingBottom: spacing(10) },
  field: { marginBottom: spacing(5) },
  label: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing(2),
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    fontSize: font.h3,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
  segmentText: { fontSize: font.body, fontWeight: "700", color: colors.textMuted },
  segmentTextActive: { color: colors.onAccent },
  unitWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitInput: {
    flex: 1,
    paddingVertical: spacing(3.5),
    fontSize: font.h3,
    color: colors.text,
  },
  unitText: { fontSize: font.body, color: colors.textFaint, fontWeight: "600" },
});
