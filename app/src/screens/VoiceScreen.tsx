import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";

import { cloneVoice, isBackendConfigured, listVoiceOptions } from "../api/client";
import { useSettings } from "../store/settings";
import { Card, PrimaryButton } from "../ui/components";
import { lightHaptic } from "../ui/haptics";
import { colors, font, radius, spacing } from "../ui/theme";

export default function VoiceScreen() {
  const {
    profile,
    voice,
    voiceId,
    setVoiceId,
    voiceOptions,
    setVoiceOptions,
  } = useSettings();
  const [cloneName, setCloneName] = useState(`${profile.name} 的音色`);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setMessage("当前未配置后端地址，先使用系统音色。");
      return;
    }

    let active = true;
    setLoading(true);
    setMessage(null);

    void (async () => {
      try {
        const remoteOptions = await listVoiceOptions(profile.userId);
        if (active) {
          setVoiceOptions(remoteOptions);
        }
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "语音列表加载失败。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [profile.userId, setVoiceOptions]);

  const uploadClone = async () => {
    if (!isBackendConfigured()) {
      setMessage("请先通过启动脚本连接后端，再上传克隆音频。");
      return;
    }

    const picked = await DocumentPicker.getDocumentAsync({
      type: ["audio/*"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) {
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const asset = picked.assets[0];
      const created = await cloneVoice(profile.userId, cloneName.trim() || `${profile.name} 的音色`, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      });
      const nextOptions = [...voiceOptions, created];
      setVoiceOptions(nextOptions);
      setVoiceId(created.id);
      setMessage("克隆音色已生成，可以直接用于训练播报。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "克隆音色失败。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>语音教练</Text>
        <Text style={styles.subtitle}>
          训练时会优先使用你选择的语音播报动作纠错、次数统计和鼓励提示。
        </Text>

        <Card style={styles.currentCard}>
          <Text style={styles.currentLabel}>当前音色</Text>
          <Text style={styles.currentName}>
            {voice.emoji} {voice.name}
          </Text>
          <Text style={styles.currentDesc}>{voice.desc}</Text>
        </Card>

        <View style={styles.list}>
          {voiceOptions.map((item) => {
            const active = item.id === voiceId;
            return (
              <Card
                key={item.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => {
                  lightHaptic();
                  setVoiceId(item.id);
                }}
              >
                <View style={styles.iconBox}>
                  <Text style={styles.icon}>{item.emoji}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioOn]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Card>
            );
          })}
        </View>

        <Card style={styles.cloneCard}>
          <Text style={styles.cloneTitle}>克隆你的音色</Text>
          <Text style={styles.cloneDesc}>
            上传一段清晰语音样本后，可在训练时用克隆音色完成播报。
          </Text>
          <TextInput
            style={styles.input}
            value={cloneName}
            onChangeText={setCloneName}
            placeholder="输入克隆音色名称"
            placeholderTextColor={colors.textFaint}
          />
          <PrimaryButton
            label={uploading ? "正在上传..." : "上传音频并生成音色"}
            onPress={() => void uploadClone()}
            loading={uploading}
            disabled={uploading}
            style={{ marginTop: spacing(3) }}
          />
        </Card>

        {loading ? <Text style={styles.message}>正在同步语音列表...</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
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
  },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    marginTop: spacing(1),
    lineHeight: 22,
    marginBottom: spacing(5),
  },
  currentCard: { gap: spacing(1) },
  currentLabel: { fontSize: font.small, color: colors.textFaint, fontWeight: "700" },
  currentName: { fontSize: font.h2, color: colors.text, fontWeight: "800" },
  currentDesc: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
  list: { gap: spacing(3), marginTop: spacing(4) },
  row: { flexDirection: "row", alignItems: "center", gap: spacing(4) },
  rowActive: { borderWidth: 2, borderColor: colors.accent },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 24 },
  rowBody: { flex: 1 },
  name: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  desc: { fontSize: font.small, color: colors.textFaint, marginTop: spacing(0.5) },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  cloneCard: { marginTop: spacing(5) },
  cloneTitle: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  cloneDesc: {
    fontSize: font.small,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing(1),
  },
  input: {
    marginTop: spacing(3),
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    fontSize: font.body,
  },
  message: {
    marginTop: spacing(4),
    textAlign: "center",
    color: colors.textMuted,
    fontSize: font.small,
    lineHeight: 20,
  },
});
