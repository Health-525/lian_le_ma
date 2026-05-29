/**
 * 前端领域类型（精简版）。
 * 现在只保留"选择动作 → 姿势矫正"两步流程需要的类型。
 */

export type SupportedExercise =
  | "squat"
  | "lunge"
  | "push_up"
  | "overhead_press";

/** 动作元信息：用于选择页展示与站位提示。 */
export interface ExerciseMeta {
  value: SupportedExercise;
  label: string;
  emoji: string;
  /** 主要锻炼部位。 */
  muscle: string;
  /** 难度 1~3。 */
  level: 1 | 2 | 3;
  /** 卡片副标题（一句卖点）。 */
  blurb: string;
  /** 站位提示（训练页用）。 */
  tip: string;
}

export const EXERCISES: ExerciseMeta[] = [
  {
    value: "squat",
    label: "深蹲",
    emoji: "🏋️",
    muscle: "腿 · 臀 · 核心",
    level: 2,
    blurb: "下肢力量基石",
    tip: "让全身进入画面，脚尖与膝盖尽量保持同向。",
  },
  {
    value: "lunge",
    label: "弓步蹲",
    emoji: "🦵",
    muscle: "腿 · 臀 · 平衡",
    level: 2,
    blurb: "单侧稳定与协调",
    tip: "前后腿都要拍到，给迈步和下蹲留出空间。",
  },
  {
    value: "push_up",
    label: "俯卧撑",
    emoji: "💪",
    muscle: "胸 · 肩 · 三头",
    level: 3,
    blurb: "上肢推力经典",
    tip: "尽量使用侧面机位，肩、髋、踝最好都能看到。",
  },
  {
    value: "overhead_press",
    label: "推举",
    emoji: "🙆",
    muscle: "肩 · 三头 · 核心",
    level: 3,
    blurb: "肩部力量塑形",
    tip: "全身站直入镜，头顶上方给手臂伸直留出空间。",
  },
];

export const EXERCISE_LABEL: Record<SupportedExercise, string> = {
  squat: "深蹲",
  lunge: "弓步蹲",
  push_up: "俯卧撑",
  overhead_press: "推举",
};
