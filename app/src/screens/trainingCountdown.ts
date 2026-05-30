export type TrainingUiPhase =
  | "initializing"
  | "ready_to_start"
  | "countdown"
  | "running"
  | "paused";

export type CountdownStep = "1" | "2" | "3" | "Go!";

export const COUNTDOWN_STEPS: readonly CountdownStep[] = ["1", "2", "3", "Go!"];
export const COUNTDOWN_STEP_MS = 700;
export const GO_STEP_MS = 450;

export function getPrimaryControlLabel(phase: TrainingUiPhase): string {
  switch (phase) {
    case "ready_to_start":
      return "开始训练";
    case "running":
      return "暂停";
    case "paused":
      return "继续";
    case "countdown":
    case "initializing":
    default:
      return "准备中";
  }
}

export function isPrimaryControlDisabled(
  phase: TrainingUiPhase,
  cameraReady: boolean
): boolean {
  if (!cameraReady) {
    return true;
  }
  return phase === "initializing" || phase === "countdown";
}

export function getNextPhaseAfterPrimaryPress(
  phase: TrainingUiPhase
): TrainingUiPhase {
  switch (phase) {
    case "ready_to_start":
      return "countdown";
    case "running":
      return "paused";
    case "paused":
      return "running";
    default:
      return phase;
  }
}

export interface RunCountdownSequenceArgs {
  steps?: readonly CountdownStep[];
  onStep: (step: CountdownStep) => void | Promise<void>;
  speak: (utterance: string) => void | Promise<void>;
  wait: (ms: number) => void | Promise<void>;
}

export async function runCountdownSequence({
  steps = COUNTDOWN_STEPS,
  onStep,
  speak,
  wait,
}: RunCountdownSequenceArgs): Promise<void> {
  for (const step of steps) {
    await onStep(step);

    try {
      await speak(step === "Go!" ? "Go" : step);
    } catch {
      // Countdown visuals must continue even if local speech fails.
    }

    await wait(step === "Go!" ? GO_STEP_MS : COUNTDOWN_STEP_MS);
  }
}
