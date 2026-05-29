/**
 * 前端领域类型（与后端 design.md 数据模型对齐的精简版）。
 * demo 阶段用于本地 mock 数据流；接入后端后可直接复用这些类型。
 */

export type TrainingGoal =
  | "fat_loss"
  | "muscle_gain"
  | "endurance"
  | "general_fitness";

export type Venue = "home" | "gym" | "outdoor";

export type Equipment =
  | "none"
  | "dumbbell"
  | "barbell"
  | "resistance_band"
  | "bench";

export type InjuryRiskArea =
  | "shoulder"
  | "lower_back"
  | "knee"
  | "wrist"
  | "neck";

export type SupportedExercise =
  | "squat"
  | "lunge"
  | "overhead_press"
  | "push_up";

export interface Assessment {
  goal: TrainingGoal;
  venue: Venue;
  equipment: Equipment[];
  weeklyFrequency: number; // 1~7
  injuryRisk: InjuryRiskArea[];
}

export interface PlanExercise {
  name: string;
  exercise: SupportedExercise | null;
  sets: number;
  reps: number;
  restSec: number;
  difficulty: number; // 1~5
}

export interface PlanDay {
  dayIndex: number; // 1~7
  isRestDay: boolean;
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  days: PlanDay[];
}

export interface SessionReport {
  formScore: number; // 0~100
  riskNotes: string[];
  correctionCount: number;
  nextFocus: string;
}
