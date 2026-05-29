/**
 * 全局应用状态（Zustand）。
 * 管理评估输入、生成的计划、训练会话中的动作分析累计与最终报告。
 */
import { create } from "zustand";

import type { FormAnalysisResult } from "../analysis";
import { generatePlan } from "../domain/planGenerator";
import type { Assessment, SessionReport, TrainingPlan } from "../types";

interface AppState {
  assessment: Assessment | null;
  plan: TrainingPlan | null;
  /** 当前训练会话内累计的动作分析结果。 */
  analyses: FormAnalysisResult[];
  report: SessionReport | null;

  submitAssessment: (assessment: Assessment) => void;
  startSession: () => void;
  recordAnalysis: (result: FormAnalysisResult) => void;
  finishSession: () => SessionReport;
  reset: () => void;
}

/** 由本次会话的分析结果确定性地计算训练报告（镜像后端 form_score / next_focus）。 */
function buildReport(analyses: FormAnalysisResult[]): SessionReport {
  const conclusive = analyses.filter((a) => a.status === "conclusive");
  const standardCount = conclusive.filter((a) => a.isStandard).length;
  const formScore =
    conclusive.length === 0
      ? 0
      : Math.round((standardCount / conclusive.length) * 100);

  const corrections = conclusive.filter(
    (a) => !a.isStandard && a.correctionText
  );
  const correctionCount = corrections.length;

  // 统计最高频问题部位作为"下一次重点"。
  const areaFreq = new Map<string, number>();
  for (const a of conclusive) {
    for (const p of a.problemAreas) {
      areaFreq.set(p.area, (areaFreq.get(p.area) ?? 0) + 1);
    }
  }
  let topArea: string | null = null;
  let topCount = 0;
  for (const [area, count] of areaFreq) {
    if (count > topCount) {
      topArea = area;
      topCount = count;
    }
  }

  const riskNotes = topArea
    ? [`本次「${topArea}」问题出现较多，注意相关部位（不构成医疗建议）。`]
    : ["本次未发现明显风险点（不构成医疗建议）。"];
  const nextFocus = topArea
    ? `下次重点改善「${topArea}」相关动作质量。`
    : "下次保持当前动作质量，可适度提升强度。";

  return { formScore, riskNotes, correctionCount, nextFocus };
}

export const useAppStore = create<AppState>((set, get) => ({
  assessment: null,
  plan: null,
  analyses: [],
  report: null,

  submitAssessment: (assessment) => {
    const plan = generatePlan(assessment);
    set({ assessment, plan, report: null, analyses: [] });
  },

  startSession: () => set({ analyses: [], report: null }),

  recordAnalysis: (result) =>
    set((state) => ({ analyses: [...state.analyses, result] })),

  finishSession: () => {
    const report = buildReport(get().analyses);
    set({ report });
    return report;
  },

  reset: () =>
    set({ assessment: null, plan: null, analyses: [], report: null }),
}));
