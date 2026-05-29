/**
 * 远程动作分析 Provider（对接模型团队接口）。
 *
 * ⚠️ 接入步骤（模型接口就绪后）：
 *   1. 把 baseUrl 指向模型服务地址（或经后端 /api/sessions/{sid}/form-analysis 转发）。
 *   2. 按模型实际的请求/响应字段，调整下方 request body 与 mapResponse()。
 *   3. 在 ./index.ts 的 getFormProvider() 中改为返回 HttpFormProvider。
 * 训练页（screens/Training）无需任何改动。
 */
import { composeCorrection } from "./corrections";
import type {
  FormAnalysisProvider,
  FormAnalysisResult,
  FormContext,
} from "./FormAnalysisProvider";

export class HttpFormProvider implements FormAnalysisProvider {
  constructor(private readonly baseUrl: string) {}

  async analyze(context: FormContext): Promise<FormAnalysisResult> {
    const res = await fetch(`${this.baseUrl}/form-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise: context.exercise,
        image_base64: context.imageBase64,
        keypoints: context.keypoints,
        frame_count: context.frameCount,
      }),
    });

    if (!res.ok) {
      throw new Error(`form-analysis failed: ${res.status}`);
    }
    const data = await res.json();
    return this.mapResponse(data);
  }

  /** 将模型/后端响应映射为统一的 FormAnalysisResult。字段名按实际接口调整。 */
  private mapResponse(data: any): FormAnalysisResult {
    const problemAreas = (data.problem_areas ?? []).map((p: any) => ({
      area: p.area,
      severity: p.severity ?? "medium",
    }));
    const isStandard = Boolean(data.is_standard);
    const status = data.status ?? "conclusive";
    return {
      isStandard,
      confidence: data.confidence ?? "medium",
      problemAreas,
      status,
      correctionText:
        data.correction_text ??
        (!isStandard && status === "conclusive"
          ? composeCorrection(problemAreas)
          : undefined),
    };
  }
}
