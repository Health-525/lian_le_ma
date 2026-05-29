/**
 * 动作分析 Provider 抽象。
 *
 * 训练页只依赖这个接口，不关心判定来自本地桩还是远程模型。
 * - 未配置模型地址：StubFormProvider（本地假数据，扫码即跑）。
 * - 配了 EXPO_PUBLIC_MODEL_BASE_URL：ModelCoachProvider（直连 web_app.py）。
 * 切换逻辑见 ./index.ts。
 */
import type { SupportedExercise } from "../types";

export type ConfidenceLevel = "low" | "medium" | "high";
export type FormStatus = "conclusive" | "inconclusive";
export type StatusColor = "idle" | "good" | "warn" | "alert";

export interface ProblemArea {
  area: string;
  severity: ConfidenceLevel;
}

/** 分析输入：动作类型 + 采集上下文。 */
export interface FormContext {
  exercise: SupportedExercise;
  /** 采集到的帧数（桩用它演示"帧数不足 → inconclusive"）。 */
  frameCount?: number;
  /** base64 图像（纯 base64 或 dataURL 都可），真实模型逐帧分析用。 */
  imageBase64?: string;
}

/** 分析输出：统一的动作分析结果。 */
export interface FormAnalysisResult {
  isStandard: boolean;
  confidence: ConfidenceLevel;
  problemAreas: ProblemArea[];
  status: FormStatus;
  /** 纠正反馈文本（不标准且 conclusive 时非空）。 */
  correctionText?: string;
  /** 模型决定此刻应播报的内容（已含播报节流/冷却）。 */
  speakText?: string;
  /** 实时统计：已完成的动作次数。 */
  repCount?: number;
  /** 动作阶段（如 down/up/ready）。 */
  phase?: string;
  /** 状态色：idle/good/warn/alert，用于 UI 着色。 */
  statusColor?: StatusColor;
  /** 主提示。 */
  primaryCue?: string;
  /** 副提示。 */
  secondaryCue?: string;
  /** 自动识别模式下模型识别出的动作标签。 */
  activeExerciseLabel?: string;
}

/** Provider 契约：所有实现都暴露这一个方法。 */
export interface FormAnalysisProvider {
  analyze(context: FormContext): Promise<FormAnalysisResult>;
}
