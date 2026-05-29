import type { SupportedExercise } from "./types";

/** 健身 tab 内部的栈：Pick（选动作）→ Training（实时姿势矫正）。 */
export type FitnessStackParamList = {
  Pick: undefined;
  Training: { exercise: SupportedExercise };
};

/** 底部 tab：健身 / 音色。 */
export type RootTabParamList = {
  Fitness: undefined;
  Voice: undefined;
};
