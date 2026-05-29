/**
 * 动作分析 Provider 抽象（对应 design.md 的 Form_Analysis_Provider 契约）。
 *
 * 设计意图：训练页只依赖这个接口，不关心动作判定来自本地桩还是远程模型。
 * - 现在：使用 StubFormProvider（本地确定性假数据，标准/不标准交替），保证 demo 立即可跑。
 * - 以后：模型团队给出接口后，用 HttpFormProvider 实现同一接口接入，训练页代码不改。
 *
 * 切换方式见 ./index.ts 中的 getFormProvider()。
 */
import type { SupportedExercise } from "../types";

export type ConfidenceLevel = "low" | "medium" | "high";
export type FormStatus = "conclusive" | "inconclusive";

export interface ProblemArea {
  area: string;
  severity: ConfidenceLevel;
}

/** 分析输入：动作类型 + 采集上下文（帧或图像数据，按模型需要扩展）。 */
export interface FormContext {
  exercise: SupportedExercise;
  /** 可选：采集到的帧数（桩用它演示"帧数不足→inconclusive"）。 */
  frameCount?: number;
  /** 可选：base64 图像或关键点等，留给真实模型实现使用。 */
  imageBase64?: string;
  keypoints?: unknown[];
}

/** 分析输出：与后端 FormAnalysisResult 对齐。 */
export interface FormAnalysisResult {
  isStandard: boolean;
  confidence: ConfidenceLevel;
  problemAreas: ProblemArea[];
  status: FormStatus;
  /** 纠正反馈文本（不标准且 conclusive 时非空）。 */
  correctionText?: string;
}

/** Provider 契约：所有实现都暴露这一个方法。 */
export interface FormAnalysisProvider {
  analyze(context: FormContext): Promise<FormAnalysisResult>;
}
