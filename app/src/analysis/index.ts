import type { WorkoutReport } from "../api/client";
import { isBackendConfigured } from "../api/client";
import type { FormAnalysisProvider } from "./FormAnalysisProvider";
import { BackendCoachProvider } from "./BackendCoachProvider";
import { StubFormProvider } from "./StubFormProvider";

const MODEL_MODE =
  process.env.EXPO_PUBLIC_MODEL_MODE?.trim() === "auto" ? "auto" : "manual";

let backendProvider: BackendCoachProvider | null = null;
let backendProviderKey: string | null = null;
let stubProvider: StubFormProvider | null = null;

export function getFormProvider(options?: {
  userId?: string;
  voiceId?: string;
}): FormAnalysisProvider {
  if (isBackendConfigured() && options?.userId) {
    const key = `${options.userId}:${options.voiceId || "system-default"}:${MODEL_MODE}`;
    if (!backendProvider || backendProviderKey !== key) {
      backendProvider = new BackendCoachProvider(
        options.userId,
        options.voiceId || "system-default",
        MODEL_MODE
      );
      backendProviderKey = key;
    }
    return backendProvider;
  }

  if (!stubProvider) {
    stubProvider = new StubFormProvider();
  }
  return stubProvider;
}

export function isModelConnected(): boolean {
  return isBackendConfigured();
}

export async function stopFormSession(): Promise<WorkoutReport | null> {
  if (backendProvider) {
    const report = await backendProvider.stop();
    backendProvider = null;
    backendProviderKey = null;
    return report;
  }
  return null;
}

export * from "./FormAnalysisProvider";
