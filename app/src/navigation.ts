import type { CustomPlanResult, WorkoutReport } from "./api/client";
import type { SupportedExercise } from "./types";

export type WorkoutStackParamList = {
  Pick: undefined;
  Training: { exercise: SupportedExercise };
  WorkoutReport: { report: WorkoutReport };
};

export type CustomizationStackParamList = {
  CustomForm: undefined;
  PlanResult: { result: CustomPlanResult };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Voice: undefined;
};

export type RootTabParamList = {
  Workout: undefined;
  Customization: undefined;
  Profile: undefined;
};
