/**
 * 动作分析 Provider 选择器 —— 全应用唯一的"接哪个分析后端"的开关。
 *
 * 现在：返回 StubFormProvider（本地假数据，demo 立即可跑）。
 * 模型接口就绪后：把下面一行换成
 *     return new HttpFormProvider("https://你的模型服务地址");
 * 训练页不需要任何改动。
 */
import type { FormAnalysisProvider } from "./FormAnalysisProvider";
import { StubFormProvider } from "./StubFormProvider";
// import { HttpFormProvider } from "./HttpFormProvider";

let singleton: FormAnalysisProvider | null = null;

export function getFormProvider(): FormAnalysisProvider {
  if (singleton === null) {
    singleton = new StubFormProvider();
    // 接入模型时改为：
    // singleton = new HttpFormProvider("https://your-model-endpoint");
  }
  return singleton;
}

export * from "./FormAnalysisProvider";
