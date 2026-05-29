/**
 * 纠正反馈文案映射（前端 demo 版，镜像后端 Correction_Composer 的模板映射）。
 * 将 problem_areas 标识映射为面向学员的中文纠正提示。
 */
import type { ProblemArea } from "./FormAnalysisProvider";

const TEMPLATES: Record<string, string> = {
  knee_valgus: "膝盖有内扣，下蹲时让膝盖对准脚尖方向。",
  back_rounding: "腰背有弓起，收紧核心、保持背部中立。",
  shallow_depth: "下蹲深度不够，控制节奏蹲到大腿接近水平。",
  elbow_flare: "手肘外展过大，推举时让肘部略微收向身体。",
  hip_shift: "重心左右偏移，保持双脚均匀发力。",
  heel_lift: "脚跟离地，蹲起时让脚掌踩实地面。",
};

/** 根据问题部位生成纠正文本；无匹配模板时给出通用提示。 */
export function composeCorrection(problemAreas: ProblemArea[]): string {
  if (problemAreas.length === 0) {
    return "动作整体到位，继续保持稳定的节奏。";
  }
  const tips = problemAreas.map(
    (p) => TEMPLATES[p.area] ?? `注意 ${p.area} 部位的发力与姿态。`
  );
  return tips.join(" ");
}
