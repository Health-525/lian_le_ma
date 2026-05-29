/**
 * 桩动作分析 Provider（本地确定性假数据）。
 *
 * 用于模型接口就绪前打通"摄像头 → 分析 → 纠正"链路。默认按调用次序在
 * "标准 / 不标准" 之间交替，便于演示纠正反馈与训练报告。
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

  async analyze(context: FormContext): Promise<FormAnalysisResult> {
    // 帧数过少 → 无法判定（演示需求 4.5 的 inconclusive 分支）。
    if (
      context.frameCount !== undefined &&
      context.frameCount < MIN_CONCLUSIVE_FRAMES
    ) {
      return {
        isStandard: false,
        confidence: "low",
        problemAreas: [],
        status: "inconclusive",
      };
    }

    const idx = this.callIndex;
    this.callIndex += 1;

    // 偶数次：标准；奇数次：不标准并给出纠正。
    if (idx % 2 === 0) {
      return {
        isStandard: true,
        confidence: "high",
        problemAreas: [],
        status: "conclusive",
      };
    }

    const problemAreas = [
      { area: "knee_valgus" as const, severity: "high" as const },
    ];
    return {
      isStandard: false,
      confidence: "high",
      problemAreas,
      status: "conclusive",
      correctionText: composeCorrection(problemAreas),
    };
  }
}
