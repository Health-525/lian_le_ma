import {
  buildAbsoluteAudioUrl,
  sendTrainingFrame,
  startTrainingSession,
  stopTrainingSession,
  type WorkoutReport,
} from "../api/client";
import type {
  ConfidenceLevel,
  FormAnalysisProvider,
  FormAnalysisResult,
  FormContext,
  FormStatus,
  ProblemArea,
  StatusColor,
} from "./FormAnalysisProvider";
import type { SupportedExercise } from "../types";

export class BackendCoachProvider implements FormAnalysisProvider {
  private sessionId: string | null = null;
  private sessionExercise: SupportedExercise | null = null;
  private starting: Promise<string> | null = null;

  constructor(
    private readonly userId: string,
    private readonly voiceId: string,
    private readonly mode: "manual" | "auto" = "manual"
  ) {}

  private async ensureSession(exercise: SupportedExercise): Promise<string> {
    if (this.sessionId && this.sessionExercise === exercise) {
      return this.sessionId;
    }
    if (this.starting) return this.starting;

    this.starting = (async () => {
      const data = await startTrainingSession({
        user_id: this.userId,
        exercise,
        mode: this.mode,
        voice_id: this.voiceId,
      });
      this.sessionId = data.session_id;
      this.sessionExercise = exercise;
      return this.sessionId!;
    })();

    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async analyze(context: FormContext): Promise<FormAnalysisResult> {
    const sessionId = await this.ensureSession(context.exercise);
    if (!context.imageBase64) {
      return {
        isStandard: false,
        confidence: "low",
        problemAreas: [],
        status: "inconclusive",
      };
    }

    const data = await sendTrainingFrame({
      session_id: sessionId,
      image_data: context.imageBase64.includes(",")
        ? context.imageBase64
        : `data:image/jpeg;base64,${context.imageBase64}`,
    });
    return this.mapResponse(data);
  }

  async stop(): Promise<WorkoutReport | null> {
    if (!this.sessionId) return null;
    const sessionId = this.sessionId;
    this.sessionId = null;
    this.sessionExercise = null;
    try {
      return await stopTrainingSession(sessionId);
    } catch {
      return null;
    }
  }

  private mapResponse(data: any): FormAnalysisResult {
    const statusColor = (data.status_color || "idle") as StatusColor;
    const errors = Array.isArray(data.errors) ? data.errors : [];
    const isStandard = statusColor === "good";
    const confidence: ConfidenceLevel =
      statusColor === "alert" || statusColor === "good"
        ? "high"
        : statusColor === "warn"
          ? "medium"
          : "low";
    const status: FormStatus =
      data.recognition_state === "no_person" ? "inconclusive" : "conclusive";
    const problemAreas: ProblemArea[] = errors
      .filter((item: any) => item.code !== "no_person")
      .map((item: any) => ({
        area: item.code,
        severity: Number(item.severity) >= 0.85 ? "high" : "medium",
      }));

    return {
      isStandard,
      confidence,
      problemAreas,
      status,
      correctionText: data.correction_text || undefined,
      speakText: data.speak_text || undefined,
      audioUrl: buildAbsoluteAudioUrl(data.audio_url),
      speechText: data.speech_text || undefined,
      repCount: data.rep_count,
      repDelta: data.rep_delta,
      phase: data.phase,
      statusColor,
      primaryCue: data.primary_cue || undefined,
      secondaryCue: data.secondary_cue || undefined,
      activeExerciseLabel: data.active_exercise || undefined,
    };
  }
}
