/**
 * 动作库（前端 mock 版，镜像后端 deterministic/exercise_catalog.py）。
 * 用于在 demo 中本地生成计划，无需后端即可演示完整流程。
 */
import type { Equipment, InjuryRiskArea, SupportedExercise } from "../types";

export interface ExerciseDef {
  name: string;
  requiredEquipment: Equipment[];
  loads: InjuryRiskArea[];
  supported: SupportedExercise | null;
}

export const CATALOG: ExerciseDef[] = [
  { name: "深蹲", requiredEquipment: [], loads: ["knee"], supported: "squat" },
  { name: "弓步蹲", requiredEquipment: [], loads: ["knee"], supported: "lunge" },
  {
    name: "俯卧撑",
    requiredEquipment: [],
    loads: ["shoulder", "wrist"],
    supported: "push_up",
  },
  {
    name: "站姿推举",
    requiredEquipment: ["dumbbell"],
    loads: ["shoulder"],
    supported: "overhead_press",
  },
  { name: "平板支撑", requiredEquipment: [], loads: [], supported: null },
  { name: "臀桥", requiredEquipment: [], loads: [], supported: null },
  { name: "开合跳", requiredEquipment: [], loads: ["knee"], supported: null },
  {
    name: "哑铃划船",
    requiredEquipment: ["dumbbell"],
    loads: ["lower_back"],
    supported: null,
  },
  {
    name: "杠铃硬拉",
    requiredEquipment: ["barbell"],
    loads: ["lower_back"],
    supported: null,
  },
  {
    name: "弹力带划船",
    requiredEquipment: ["resistance_band"],
    loads: [],
    supported: null,
  },
];

/** 返回与器械相容、且不加载伤痛部位的动作（镜像后端 available_exercises）。 */
export function availableExercises(
  equipment: Equipment[],
  injuryRisk: InjuryRiskArea[]
): ExerciseDef[] {
  const owned = new Set(equipment);
  const risks = new Set(injuryRisk);
  return CATALOG.filter((ex) => {
    const equipOk = ex.requiredEquipment.every((e) => owned.has(e));
    const riskOk = !ex.loads.some((l) => risks.has(l));
    return equipOk && riskOk;
  });
}
