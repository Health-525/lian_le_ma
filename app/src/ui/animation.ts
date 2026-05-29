/**
 * iOS 弹簧动效预设。
 *
 * 三个预设覆盖全应用动效场景：
 *   springGentle — 小元素进出，阻尼大收得快
 *   springBouncy — 按钮/卡片点击，明显弹跳
 *   springHero  — 共享元素过渡，中等弹性
 */
import { WithSpringConfig, withSpring, withTiming } from "react-native-reanimated";

export const springGentle: WithSpringConfig = {
  damping: 18,
  stiffness: 200,
  mass: 1,
};

export const springBouncy: WithSpringConfig = {
  damping: 8,
  stiffness: 100,
  mass: 1,
};

export const springHero: WithSpringConfig = {
  damping: 12,
  stiffness: 120,
  mass: 1,
};

/** 时长 ms */
export const duration = {
  fast: 200,
  normal: 300,
  slow: 400,
} as const;

export function fadeIn(target: Parameters<typeof withTiming>[1] = { duration: duration.normal }) {
  return withTiming(1, target);
}

export function fadeOut(target: Parameters<typeof withTiming>[1] = { duration: duration.fast }) {
  return withTiming(0, target);
}

export function slideUp(v: number, config = springGentle) {
  return withSpring(v, config);
}

export function scaleBounce(v: number, config = springBouncy) {
  return withSpring(v, config);
}
