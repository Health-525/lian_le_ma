/**
 * 语音教练会话：根据 Stitch 的 Coach AI 设计实现的主动训练语音模式。
 */
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppStore } from "../store/useAppStore";
import type { RootStackParamList } from "../navigation";
import { aura } from "../ui/aura";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceCoaching">;

const WAVE_BARS = [32, 74, 96, 122, 92, 72, 44];

export default function VoiceCoachingScreen({ navigation }: Props) {
  const [listening, setListening] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);

  const onFinish = () => {
    useAppStore.getState().finishSession();
    navigation.navigate("Report");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.ambient} />

      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.iconButton}
          onPress={() => navigation.navigate("Training")}
        >
          <Text style={styles.iconText}>⌄</Text>
        </TouchableOpacity>

        <View style={styles.sessionBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.sessionBadgeText}>实时训练</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.iconButton}
          onPress={() => navigation.navigate("Training")}
        >
          <Text style={styles.iconText}>摄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.techLeft}>
        <Text style={styles.techText}>HEART RATE: 142 BPM</Text>
      </View>
      <View style={styles.techRight}>
        <Text style={styles.techText}>STREAK: 5 DAYS</Text>
      </View>
      <View style={styles.techBottom}>
        <Text style={styles.techText}>VOICE MODE: ACTIVE</Text>
      </View>

      <View style={styles.main}>
        <View style={styles.transcriptionArea}>
          <Text style={styles.transcription}>
            继续加油！再做 5 个，保持动作标准。
          </Text>
        </View>

        <View style={styles.waveStage}>
          <View style={styles.waveGlow} />
          {WAVE_BARS.map((height, index) => (
            <View
              key={index}
              style={[
                styles.waveBar,
                index === 3 && styles.waveBarMain,
                {
                  height: listening ? height : Math.max(18, height * 0.34),
                  width: index === 3 ? 20 : index === 2 || index === 4 ? 16 : 10,
                  opacity: listening ? 0.95 : 0.42,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={[styles.micButton, !listening && styles.micButtonOff]}
            onPress={() => setListening((current) => !current)}
          >
            <View style={styles.micPing} />
            <Text style={styles.micIcon}>{listening ? "麦" : "停"}</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.secondaryButton}
              onPress={() => setSpeakerOn((current) => !current)}
            >
              <Text style={styles.secondaryIcon}>{speakerOn ? "声" : "静"}</Text>
              <Text style={styles.secondaryText}>扬声器</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.endButton}
              onPress={onFinish}
            >
              <Text style={styles.endIcon}>×</Text>
              <Text style={styles.endText}>结束训练</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: aura.colors.background,
    overflow: "hidden",
  },
  ambient: {
    backgroundColor: "rgba(0, 86, 196, 0.08)",
    borderRadius: 420,
    height: 760,
    left: -180,
    position: "absolute",
    top: 130,
    width: 760,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 86,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    width: 42,
  },
  iconText: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 18,
    fontWeight: "900",
  },
  sessionBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  liveDot: {
    backgroundColor: aura.colors.blue,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  sessionBadgeText: {
    color: aura.colors.ink,
    fontFamily: aura.font.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
  techLeft: {
    left: 20,
    position: "absolute",
    top: 118,
  },
  techRight: {
    position: "absolute",
    right: 20,
    top: 118,
  },
  techBottom: {
    bottom: 152,
    left: 20,
    position: "absolute",
  },
  techText: {
    color: "rgba(0, 0, 0, 0.3)",
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  main: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  transcriptionArea: {
    flex: 1,
    justifyContent: "flex-end",
    maxWidth: 390,
    paddingBottom: 34,
    width: "100%",
  },
  transcription: {
    color: aura.colors.ink,
    fontFamily: aura.font.uiHeavy,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 39,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.08)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  waveStage: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    height: 190,
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    width: "100%",
  },
  waveGlow: {
    backgroundColor: "rgba(0, 86, 196, 0.08)",
    borderRadius: 170,
    height: 170,
    position: "absolute",
    width: 320,
  },
  waveBar: {
    backgroundColor: "rgba(0, 86, 196, 0.62)",
    borderRadius: aura.radius.pill,
  },
  waveBarMain: {
    backgroundColor: aura.colors.blue,
    shadowColor: aura.colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  controls: {
    alignItems: "center",
    gap: 24,
    width: "100%",
  },
  micButton: {
    alignItems: "center",
    backgroundColor: aura.colors.blue,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    shadowColor: aura.colors.blue,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    width: 80,
  },
  micButtonOff: {
    backgroundColor: aura.colors.inkMuted,
  },
  micPing: {
    borderColor: "rgba(0, 86, 196, 0.35)",
    borderRadius: 45,
    borderWidth: 2,
    height: 92,
    position: "absolute",
    width: 92,
  },
  micIcon: {
    color: aura.colors.surface,
    fontFamily: aura.font.uiHeavy,
    fontSize: 26,
    fontWeight: "900",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  secondaryIcon: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 16,
  },
  secondaryText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "800",
  },
  endButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 218, 214, 0.88)",
    borderColor: "rgba(186, 26, 26, 0.2)",
    borderRadius: aura.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  endIcon: {
    color: "#93000a",
    fontFamily: aura.font.uiHeavy,
    fontSize: 18,
    fontWeight: "900",
  },
  endText: {
    color: "#93000a",
    fontFamily: aura.font.uiHeavy,
    fontSize: 15,
    fontWeight: "900",
  },
});
