import { composeCorrection } from "./corrections";
import type {
  FormAnalysisProvider,
  FormAnalysisResult,
  FormContext,
} from "./FormAnalysisProvider";

const MIN_CONCLUSIVE_FRAMES = 5;

export class StubFormProvider implements FormAnalysisProvider {
  private callIndex = 0;
  private reps = 0;

  async analyze(context: FormContext): Promise<FormAnalysisResult> {
    if (
      context.frameCount !== undefined &&
      context.frameCount < MIN_CONCLUSIVE_FRAMES
    ) {
      return {
        isStandard: false,
        confidence: "low",
        problemAreas: [],
        status: "inconclusive",
        statusColor: "warn",
        primaryCue: "暂时没有识别到完整人体，请让全身进入画面。",
      };
    }

    const idx = this.callIndex;
    this.callIndex += 1;

    if (idx % 2 === 0) {
      this.reps += 1;
      return {
        isStandard: true,
        confidence: "high",
        problemAreas: [],
        status: "conclusive",
        statusColor: "good",
        repCount: this.reps,
        repDelta: 1,
        primaryCue: "动作标准，继续保持当前节奏。",
        phase: "top",
        speakText:
          this.reps % 3 === 0
            ? `第${this.reps}次，节奏很稳，继续保持。`
            : `第${this.reps}次`,
      };
    }

    const problemAreas = [
      { area: "knee_valgus" as const, severity: "high" as const },
    ];
    const correctionText = composeCorrection(problemAreas);
    return {
      isStandard: false,
      confidence: "high",
      problemAreas,
      status: "conclusive",
      statusColor: "alert",
      correctionText,
      primaryCue: correctionText,
      phase: "lowering",
      repCount: this.reps,
      speakText: correctionText,
    };
  }
}
