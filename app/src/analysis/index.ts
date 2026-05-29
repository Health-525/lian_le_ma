/**
 * 动作分析 Provider 选择器 —— 全应用唯一的"接哪个分析后端"的开关。
 *
 *   1. 配了 EXPO_PUBLIC_MODEL_BASE_URL → ModelCoachProvider，
 *      直连模型服务 web_app.py 的 /api/session/*（JSON + dataURL 逐帧）。
 *   2. 未配置 → StubFormProvider 本地桩演示。
 *
 * 在 app/.env 配置（web_app.py 默认监听 4000）：
 *   EXPO_PUBLIC_MODEL_BASE_URL=http://10.160.0.120:4000
 *   EXPO_PUBLIC_MODEL_MODE=manual   # 或 auto（模型自动识别动作）
 */
import type { FormAnalysisProvider } from "./FormAnalysisProvider";
import { ModelCoachProvider } from "./ModelCoachProvider";
import { StubFormProvider } from "./StubFormProvider";

const MODEL_BASE_URL = process.env.EXPO_PUBLIC_MODEL_BASE_URL?.trim();
const MODEL_MODE =
  process.env.EXPO_PUBLIC_MODEL_MODE?.trim() === "auto" ? "auto" : "manual";

let singleton: FormAnalysisProvider | null = null;

export function getFormProvider(): FormAnalysisProvider {
  if (singleton === null) {
    singleton = MODEL_BASE_URL
      ? new ModelCoachProvider(MODEL_BASE_URL, MODEL_MODE)
      : new StubFormProvider();
  }
  return singleton;
}

/** 是否已接入真实模型（供 UI 提示用）。 */
export function isModelConnected(): boolean {
  return Boolean(MODEL_BASE_URL);
}

/** 若当前 Provider 支持会话结束（ModelCoachProvider.stop），调用之。 */
export async function stopFormSession(): Promise<void> {
  const p = singleton as { stop?: () => Promise<unknown> } | null;
  if (p && typeof p.stop === "function") {
    await p.stop();
  }
}

export * from "./FormAnalysisProvider";
export { ModelCoachProvider } from "./ModelCoachProvider";
