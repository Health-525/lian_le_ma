/**
 * 通用 UI 基元 —— iOS 风格升级版。
 *
 * Card / PrimaryButton / GhostButton / Pill / GlassCard。
 * 全部带弹簧动效 + 触觉反馈。
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors, elevation, font, radius, spacing } from "./theme";
import { springBouncy, springGentle } from "./animation";
import { heavyHaptic, lightHaptic } from "./haptics";

/* ───────── Pill ───────── */

export function Pill({
  text,
  color = colors.textMuted,
  tint = "transparent",
  solid = false,
}: {
  text: string;
  color?: string;
  tint?: string;
  solid?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        solid
          ? { backgroundColor: color }
          : { backgroundColor: tint, borderColor: color, borderWidth: 1 },
      ]}
    >
      <Text style={[styles.pillText, { color: solid ? "#000" : color }]}>{text}</Text>
    </View>
  );
}

/* ───────── Card ───────── */

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springGentle);
    lightHaptic();
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, springBouncy);
  };

  const content = (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

/* ───────── GlassCard（毛玻璃卡片，用于叠加层） ───────── */

export function GlassCard({
  children,
  style,
  intensity = 30,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

/* ───────── PrimaryButton ───────── */

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  tone = colors.accent,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={() => {
          heavyHaptic();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.96, springGentle);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springBouncy);
        }}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: tone },
          (disabled || loading) && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ───────── GhostButton ───────── */

export function GhostButton({
  label,
  onPress,
  tone = colors.text,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={() => {
          lightHaptic();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.97, springGentle);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springBouncy);
        }}
        style={({ pressed }) => [
          styles.ghost,
          { borderColor: tone },
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.ghostText, { color: tone }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
  },
  pillText: { fontSize: font.tiny, fontWeight: "700", letterSpacing: 0.3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    ...elevation("card"),
  },

  glassCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },

  btn: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(5),
    ...elevation("float"),
  },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnText: {
    color: "#fff",
    fontSize: font.h3,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  ghost: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(5),
  },
  ghostText: { fontSize: font.h3, fontWeight: "600" },
});
