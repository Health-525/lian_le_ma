/**
 * 设计系统 token —— Keep 风格（浅色 + 标志绿）。
 *
 * 主界面：干净白底、大量留白、Keep 绿主色、轻投影卡片。
 * 摄像头训练页例外：使用深色沉浸式（见 darkSurface 等），营造高级感。
 */
import { Platform, type ViewStyle } from "react-native";

export const colors = {
  // 浅色基底
  bg: "#FFFFFF",
  bgElevated: "#F7F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F4F7",
  border: "#E6E9EF",
  borderSubtle: "#EEF1F5",

  // 文字（深色字）
  text: "#1A1D23",
  textMuted: "#6B7280",
  textFaint: "#9AA1AC",

  // 品牌主色：Keep 绿
  accent: "#02C56E",
  accentDeep: "#00A85D",
  accentSoft: "rgba(2,197,110,0.12)",
  onAccent: "#FFFFFF",

  // 语义状态（摄像头训练页用）
  good: "#02C56E",
  warn: "#F5A623",
  alert: "#FF4D4F",
  idle: "#9AA1AC",

  // 深色沉浸（仅训练页）
  darkBg: "#0B0E13",
  darkSurface: "rgba(20,24,32,0.72)",
  darkBorder: "rgba(255,255,255,0.14)",
  scrim: "rgba(8,11,16,0.45)",
  scrimStrong: "rgba(8,11,16,0.8)",
  glass: "rgba(20,24,32,0.6)",
} as const;

/** 8pt 网格间距。 */
export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  display: 40,
  h1: 28,
  h2: 21,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

/** 跨平台阴影（浅色风格用柔和投影）。 */
export function elevation(level: "card" | "float" | "hero"): ViewStyle {
  const map = {
    card: { e: 2, o: 0.06, r: 12, y: 4, c: "#1A1D23" },
    float: { e: 6, o: 0.12, r: 20, y: 8, c: "#1A1D23" },
    hero: { e: 10, o: 0.22, r: 28, y: 12, c: "#02C56E" },
  } as const;
  const { e, o, r, y, c } = map[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: c,
      shadowOpacity: o,
      shadowRadius: r,
      shadowOffset: { width: 0, height: y },
    },
    android: { elevation: e },
    default: {},
  })!;
}

/** 状态色 → 调色板（摄像头训练页用）。 */
export type StatusTone = "idle" | "good" | "warn" | "alert";
export function toneOf(tone: StatusTone) {
  switch (tone) {
    case "good":
      return { color: colors.good, label: "标准", tint: "rgba(2,197,110,0.18)" };
    case "warn":
      return { color: colors.warn, label: "注意", tint: "rgba(245,166,35,0.18)" };
    case "alert":
      return { color: colors.alert, label: "需纠正", tint: "rgba(255,77,79,0.18)" };
    default:
      return { color: colors.idle, label: "等待中", tint: "rgba(154,161,172,0.18)" };
  }
}
