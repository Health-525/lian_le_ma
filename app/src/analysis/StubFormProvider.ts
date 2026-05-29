/**
 * 桩动作分析 Provider（本地确定性假数据）。
 *
 * 未配置模型地址时使用，打通"摄像头 → 分析 → 纠正"链路，扫码即可演示。
 * 按调用次序在标准/不标准之间交替，并模拟次数、状态色与播报。
 */
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
        primaryCue: "未识别到人，请让全身入镜。",
      };
    }

    const idx = this.callIndex;
    this.callIndex += 1;

    // 偶数次：标准；奇数次：不标准并给出纠正。
    if (idx % 2 === 0) {
      this.reps += 1;
      return {
        isStandard: true,
        confidence: "high",
        problemAreas: [],
        status: "conclusive",
        statusColor: "good",
        repCount: this.reps,
        primaryCue: "动作标准，保持节奏！",
        phase: "up",
        speakText: this.reps % 3 === 0 ? "节奏很稳，继续保持！" : undefined,
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
      phase: "down",
      repCount: this.reps,
      speakText: correctionText,
    };
  }
}
