/**
 * 设计系统 token —— iOS Dark Mode 语义。
 *
 * 原则：Apple Fitness+ 风格，纯黑基底、毛玻璃层次、SF 排版、弹簧动效。
 * 仅面向 iOS，不做 Android 兼容。
 */
import { Platform, type ViewStyle } from "react-native";

export const colors = {
  // iOS 系统背景层次
  bg: "#000000",
  bgElevated: "#1C1C1E",
  surface: "#2C2C2E",
  surfaceAlt: "#3A3A3C",
  border: "#38383A",
  borderSubtle: "#2C2C2E",

  // iOS SF 文字色系
  text: "#FFFFFF",
  textMuted: "#EBEBF5",
  textFaint: "#8E8E93",

  // iOS 语义系统色
  accent: "#0A84FF",
  accentDeep: "#0066CC",
  accentSoft: "rgba(10,132,255,0.12)",

  good: "#30D158",
  warn: "#FFD60A",
  alert: "#FF453A",
  idle: "#8E8E93",
} as const;

/** 8pt 网格间距。 */
export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** iOS SF 排版层级 */
export const font = {
  bigNumber: 96,
  display: 48,
  h1: 34,
  h2: 22,
  h3: 17,
  body: 17,
  small: 15,
  tiny: 13,
  caption: 11,
} as const;

/** BlurView intensity */
export const blur = {
  light: 10,
  medium: 20,
  heavy: 40,
} as const;

export function elevation(level: "card" | "float" | "hero"): ViewStyle {
  const map = {
    card: { o: 0.08, r: 8, y: 4 },
    float: { o: 0.14, r: 16, y: 8 },
    hero: { o: 0.24, r: 28, y: 12 },
  } as const;
  const { o, r, y } = map[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOpacity: o,
      shadowRadius: r,
      shadowOffset: { width: 0, height: y },
    },
    default: {},
  })!;
}

export type StatusTone = "idle" | "good" | "warn" | "alert";

export function toneOf(tone: StatusTone) {
  switch (tone) {
    case "good":
      return { color: colors.good, label: "标准", tint: "rgba(48,209,88,0.14)" };
    case "warn":
      return { color: colors.warn, label: "注意", tint: "rgba(255,214,10,0.14)" };
    case "alert":
      return { color: colors.alert, label: "需纠正", tint: "rgba(255,69,58,0.14)" };
    default:
      return { color: colors.idle, label: "等待中", tint: "rgba(142,142,147,0.14)" };
  }
}
