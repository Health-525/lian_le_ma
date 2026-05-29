import { type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

export const aura = {
  colors: {
    background: "#f7f9fc",
    ink: "#050608",
    inkMuted: "rgba(5, 6, 8, 0.48)",
    surface: "#ffffff",
    surfaceSoft: "rgba(255, 255, 255, 0.92)",
    glassDark: "rgba(255, 255, 255, 0.08)",
    glassInput: "rgba(0, 0, 0, 0.06)",
    blue: "#2a6fe5",
    blueSoft: "#8ba3cc",
    outline: "rgba(5, 6, 8, 0.08)",
    darkMuted: "rgba(255, 255, 255, 0.42)",
  },
  radius: {
    sm: 8,
    md: 18,
    lg: 28,
    xl: 34,
    pill: 999,
  },
  font: {
    ui: Platform.select({
      ios: "Avenir Next",
      android: "sans-serif",
      default: undefined,
    }),
    uiHeavy: Platform.select({
      ios: "AvenirNext-Heavy",
      android: "sans-serif-black",
      default: undefined,
    }),
    mono: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
};

export function LogoMark({
  size = 36,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const color = inverted ? aura.colors.surface : aura.colors.ink;
  return (
    <View
      style={[
        styles.logoFrame,
        {
          width: size,
          height: size,
          borderColor: color,
        },
      ]}
    >
      <View
        style={[
          styles.logoCircle,
          {
            width: size * 0.66,
            height: size * 0.66,
            borderRadius: size,
            borderColor: color,
          },
        ]}
      />
    </View>
  );
}

export function TechLabel({
  children,
  light = false,
  style,
}: {
  children: ReactNode;
  light?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        styles.techLabel,
        light ? styles.techLabelLight : styles.techLabelDark,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function PillBadge({
  children,
  active = false,
  light = false,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  light?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.badge,
        light && styles.badgeLight,
        active && styles.badgeActive,
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          light && styles.badgeTextLight,
          active && styles.badgeTextActive,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  logoCircle: {
    borderWidth: 2,
  },
  techLabel: {
    fontFamily: aura.font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  techLabelDark: {
    color: "rgba(5, 6, 8, 0.42)",
  },
  techLabelLight: {
    color: "rgba(255, 255, 255, 0.42)",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: aura.radius.pill,
    backgroundColor: "rgba(5, 6, 8, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeLight: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
  },
  badgeActive: {
    backgroundColor: aura.colors.ink,
  },
  badgeText: {
    color: aura.colors.inkMuted,
    fontFamily: aura.font.mono,
    fontSize: 9,
    letterSpacing: 0.9,
  },
  badgeTextLight: {
    color: "rgba(255, 255, 255, 0.72)",
  },
  badgeTextActive: {
    color: aura.colors.surface,
  },
});
