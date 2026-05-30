import type { SupportedExercise } from "../types";

export type ConfidenceLevel = "low" | "medium" | "high";
export type FormStatus = "conclusive" | "inconclusive";
export type StatusColor = "idle" | "good" | "warn" | "alert";

export interface ProblemArea {
  area: string;
  severity: ConfidenceLevel;
}

export interface FormContext {
  exercise: SupportedExercise;
  frameCount?: number;
  imageBase64?: string;
}

export interface FormAnalysisResult {
  isStandard: boolean;
  confidence: ConfidenceLevel;
  problemAreas: ProblemArea[];
  status: FormStatus;
  correctionText?: string;
  speakText?: string;
  audioUrl?: string | null;
  speechText?: string | null;
  repCount?: number;
  repDelta?: number;
  phase?: string;
  statusColor?: StatusColor;
  primaryCue?: string;
  secondaryCue?: string;
  activeExerciseLabel?: string;
}

export interface FormAnalysisProvider {
  analyze(context: FormContext): Promise<FormAnalysisResult>;
}
