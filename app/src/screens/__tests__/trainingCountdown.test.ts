import assert from "node:assert/strict";
import test from "node:test";

import {
  COUNTDOWN_STEP_MS,
  COUNTDOWN_STEPS,
  GO_STEP_MS,
  getNextPhaseAfterPrimaryPress,
  getPrimaryControlLabel,
  isPrimaryControlDisabled,
  runCountdownSequence,
  type TrainingUiPhase,
} from "../trainingCountdown";

test("primary control labels and disabled states match the screen phases", () => {
  const enabledPhases: TrainingUiPhase[] = ["ready_to_start", "running", "paused"];

  assert.equal(getPrimaryControlLabel("ready_to_start"), "开始训练");
  assert.equal(getPrimaryControlLabel("running"), "暂停");
  assert.equal(getPrimaryControlLabel("paused"), "继续");
  assert.equal(getPrimaryControlLabel("countdown"), "准备中");

  for (const phase of enabledPhases) {
    assert.equal(isPrimaryControlDisabled(phase, true), false);
  }

  assert.equal(isPrimaryControlDisabled("initializing", true), true);
  assert.equal(isPrimaryControlDisabled("countdown", true), true);
  assert.equal(isPrimaryControlDisabled("ready_to_start", false), true);
});

test("primary control transitions do not replay the countdown after pause", () => {
  assert.equal(getNextPhaseAfterPrimaryPress("ready_to_start"), "countdown");
  assert.equal(getNextPhaseAfterPrimaryPress("running"), "paused");
  assert.equal(getNextPhaseAfterPrimaryPress("paused"), "running");
  assert.equal(getNextPhaseAfterPrimaryPress("countdown"), "countdown");
});

test("runCountdownSequence emits every step in order and shortens the go beat", async () => {
  const seenSteps: string[] = [];
  const spoken: string[] = [];
  const waits: number[] = [];

  await runCountdownSequence({
    steps: COUNTDOWN_STEPS,
    onStep: async (step) => {
      seenSteps.push(step);
    },
    speak: async (utterance) => {
      spoken.push(utterance);
    },
    wait: async (ms) => {
      waits.push(ms);
    },
  });

  assert.deepEqual(seenSteps, ["1", "2", "3", "Go!"]);
  assert.deepEqual(spoken, ["1", "2", "3", "Go"]);
  assert.deepEqual(waits, [COUNTDOWN_STEP_MS, COUNTDOWN_STEP_MS, COUNTDOWN_STEP_MS, GO_STEP_MS]);
});
