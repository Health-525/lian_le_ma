export type SupportedExercise =
  | "squat"
  | "lunge"
  | "push_up"
  | "dumbbell_shoulder_press"
  | "dumbbell_rows"
  | "bicep_curls"
  | "situps"
  | "tricep_extensions"
  | "lateral_shoulder_raises"
  | "jumping_jacks";

export interface ExerciseMeta {
  value: SupportedExercise;
  label: string;
  emoji: string;
  muscle: string;
  level: 1 | 2 | 3;
  blurb: string;
  tip: string;
}

export const EXERCISES: ExerciseMeta[] = [
  {
    value: "squat",
    label: "深蹲",
    emoji: "🏋️",
    muscle: "腿部 · 臀部 · 核心",
    level: 2,
    blurb: "下肢力量基础动作",
    tip: "让全身进入画面，膝盖方向尽量跟脚尖保持一致。",
  },
  {
    value: "lunge",
    label: "弓步",
    emoji: "🦵",
    muscle: "腿部 · 臀部 · 平衡",
    level: 2,
    blurb: "单腿稳定性训练",
    tip: "前后腿都要拍到，给迈步和下蹲留出空间。",
  },
  {
    value: "push_up",
    label: "俯卧撑",
    emoji: "💪",
    muscle: "胸部 · 肩部 · 肱三头",
    level: 3,
    blurb: "经典上肢推力训练",
    tip: "尽量使用侧面机位，肩、髋、踝最好都能看到。",
  },
  {
    value: "dumbbell_shoulder_press",
    label: "哑铃肩推",
    emoji: "🏋️‍♀️",
    muscle: "肩部 · 肱三头 · 核心",
    level: 3,
    blurb: "上举推举力量训练",
    tip: "全身站直入镜，头顶上方给手臂伸直留出空间。",
  },
  {
    value: "dumbbell_rows",
    label: "哑铃划船",
    emoji: "🚣",
    muscle: "背部 · 肱二头 · 后束",
    level: 2,
    blurb: "背部发力基础动作",
    tip: "躯干和双臂尽量完整入镜，方便识别手臂轨迹。",
  },
  {
    value: "bicep_curls",
    label: "二头弯举",
    emoji: "💪",
    muscle: "肱二头",
    level: 1,
    blurb: "手臂孤立训练",
    tip: "正对镜头站立，手肘和上臂尽量保持清晰可见。",
  },
  {
    value: "situps",
    label: "仰卧起坐",
    emoji: "🧘",
    muscle: "腹部 · 核心",
    level: 1,
    blurb: "核心耐力训练",
    tip: "躯干和髋部保持在画面内，方便识别动作节奏。",
  },
  {
    value: "tricep_extensions",
    label: "三头屈伸",
    emoji: "🏹",
    muscle: "肱三头",
    level: 2,
    blurb: "手臂伸展控制训练",
    tip: "上臂尽量完整入镜，不要把哑铃路径裁出画面。",
  },
  {
    value: "lateral_shoulder_raises",
    label: "侧平举",
    emoji: "🪽",
    muscle: "三角肌中束",
    level: 1,
    blurb: "肩部稳定和宽度训练",
    tip: "双肩和双手尽量都入镜，方便判断左右两边是否平衡。",
  },
  {
    value: "jumping_jacks",
    label: "开合跳",
    emoji: "🤸",
    muscle: "全身 · 有氧",
    level: 1,
    blurb: "热身和心肺训练",
    tip: "给头到脚留出完整空间，确保起跳和落地都能看到。",
  },
];

export const EXERCISE_LABEL: Record<SupportedExercise, string> = EXERCISES.reduce(
  (acc, exercise) => {
    acc[exercise.value] = exercise.label;
    return acc;
  },
  {} as Record<SupportedExercise, string>
);
