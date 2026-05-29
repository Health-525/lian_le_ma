/**
 * 7 天计划生成（前端 mock 版，镜像后端 deterministic/plan_generator.py）。
 * demo 阶段在本地生成，保证无后端也能演示完整流程；接入后端后可改为调用 API。
 */
import type {
  Assessment,
  PlanDay,
  PlanExercise,
  TrainingGoal,
  TrainingPlan,
} from "../types";
import { availableExercises, type ExerciseDef } from "./catalog";

const PLAN_DAYS = 7;

interface Prescription {
  sets: number;
  reps: number;
  restSec: number;
  difficulty: number;
  perDay: number;
}

const GOAL_PRESCRIPTION: Record<TrainingGoal, Prescription> = {
  fat_loss: { sets: 3, reps: 15, restSec: 30, difficulty: 3, perDay: 4 },
  muscle_gain: { sets: 4, reps: 10, restSec: 75, difficulty: 4, perDay: 3 },
  endurance: { sets: 3, reps: 20, restSec: 30, difficulty: 2, perDay: 4 },
  general_fitness: { sets: 3, reps: 12, restSec: 60, difficulty: 3, perDay: 3 },
};

/** 在 1..7 中尽量均匀选出 weeklyFrequency 个训练日（确定性）。 */
function trainingDayIndices(weeklyFrequency: number): Set<number> {
  if (weeklyFrequency >= PLAN_DAYS) {
    return new Set([1, 2, 3, 4, 5, 6, 7]);
  }
  const indices = new Set<number>();
  for (let i = 0; i < weeklyFrequency; i++) {
    let day = Math.round(
      1 + (i * (PLAN_DAYS - 1)) / Math.max(weeklyFrequency - 1, 1)
    );
    while (indices.has(day)) {
      day = (day % PLAN_DAYS) + 1;
    }
    indices.add(day);
  }
  return indices;
}

function buildExercises(
  pool: ExerciseDef[],
  rx: Prescription,
  dayOffset: number
): PlanExercise[] {
  if (pool.length === 0) return [];
  const perDay = Math.min(rx.perDay, pool.length);
  const chosen: PlanExercise[] = [];
  for (let j = 0; j < perDay; j++) {
    const ex = pool[(dayOffset + j) % pool.length];
    if (!ex) continue;
    chosen.push({
      name: ex.name,
      exercise: ex.supported,
      sets: rx.sets,
      reps: rx.reps,
      restSec: rx.restSec,
      difficulty: rx.difficulty,
    });
  }
  return chosen;
}

export function generatePlan(assessment: Assessment): TrainingPlan {
  const rx = GOAL_PRESCRIPTION[assessment.goal];
  const pool = availableExercises(assessment.equipment, assessment.injuryRisk);
  const trainingDays = trainingDayIndices(assessment.weeklyFrequency);

  const days: PlanDay[] = [];
  let trainingSeen = 0;
  for (let dayIndex = 1; dayIndex <= PLAN_DAYS; dayIndex++) {
    if (trainingDays.has(dayIndex)) {
      days.push({
        dayIndex,
        isRestDay: false,
        exercises: buildExercises(pool, rx, trainingSeen),
      });
      trainingSeen += 1;
    } else {
      days.push({ dayIndex, isRestDay: true, exercises: [] });
    }
  }
  return { days };
}
