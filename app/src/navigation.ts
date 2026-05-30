import type { SupportedExercise } from "./types";

/** 运动 tab 内部栈：Pick（选动作）→ Training（实时姿势矫正）。 */
export type WorkoutStackParamList = {
  Pick: undefined;
  Training: { exercise: SupportedExercise };
};

/** 我的 tab 内部栈：Profile（个人中心）→ EditProfile → Settings → Voice。 */
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Voice: undefined;
};

/** 底部 tab：运动 / 我的。 */
export type RootTabParamList = {
  Workout: undefined;
  Profile: undefined;
};
