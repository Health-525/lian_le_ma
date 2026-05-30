# Training Countdown Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual `开始训练` flow to the training screen that shows and speaks `1, 2, 3, Go!`, then starts the existing rep-counting loop without changing any backend contracts.

**Architecture:** Keep the merge-safe scope almost entirely inside `app/src/screens/TrainingScreen.tsx`. Extract only one tiny pure helper module so the countdown sequence, button labels, and no-replay resume rules can be unit-tested without introducing a full React Native UI test harness.

**Tech Stack:** Expo 54, React Native Animated, `expo-speech`, TypeScript, Node `node:test`, `tsx`

---

## File Structure

### Files to Create

- `app/src/screens/trainingCountdown.ts`
  - Pure countdown helper for labels, phase transitions, disabled-state rules, and the async countdown sequence runner.
- `app/src/screens/__tests__/trainingCountdown.test.ts`
  - Small Node-based unit tests for the helper module.

### Files to Modify

- `app/package.json`
  - Add a focused front-end test command and the `tsx` dev dependency.
- `app/package-lock.json`
  - Lockfile update from adding `tsx`.
- `app/src/screens/TrainingScreen.tsx`
  - Remove auto-start behavior, add explicit screen phase state, wire the countdown overlay and countdown speech, and keep resume direct.

### Why this structure

- The existing screen is already the right integration point for camera readiness, training start, pause/resume, and finish.
- The extracted helper keeps the new behavior testable without introducing Jest, React Native Testing Library, or a broader front-end harness.
- No backend or navigation changes are needed for this feature.

## Implementation Notes Before Starting

- Do not touch backend files.
- Do not change `/api/training/session/*` payloads.
- Do not alter report generation.
- Do not add a replayed countdown on resume.
- Respect the current voice settings by keeping countdown speech local and allowing the visual countdown to continue even if speech fails.
- Because the current app has no React Native component test harness, apply TDD to the extracted helper and use `npm run typecheck` plus manual device verification for the screen wiring.

### Task 1: Add a Tiny Test Harness and the Countdown Helper

**Files:**
- Create: `app/src/screens/trainingCountdown.ts`
- Create: `app/src/screens/__tests__/trainingCountdown.test.ts`
- Modify: `app/package.json`
- Modify: `app/package-lock.json`

- [ ] **Step 1: Add the focused test command and write the failing helper test**

Update `app/package.json` so the front-end app can run one tiny unit-test file without adding a full UI test stack:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit",
    "test:training-countdown": "tsx --test src/screens/__tests__/trainingCountdown.test.ts"
  },
  "devDependencies": {
    "@expo/ngrok": "^4.1.3",
    "@types/react": "~19.1.0",
    "tsx": "^4.19.2",
    "typescript": "~5.9.2"
  }
}
```

Create `app/src/screens/__tests__/trainingCountdown.test.ts` with the expected contract before the helper exists:

```ts
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
```

- [ ] **Step 2: Install the tiny runner and run the test to verify it fails**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma\app
npm install --save-dev tsx
npm run test:training-countdown
```

Expected:

- `npm install` updates `package-lock.json`
- test run fails with a module error similar to `Cannot find module '../trainingCountdown'`

- [ ] **Step 3: Write the minimal helper implementation**

Create `app/src/screens/trainingCountdown.ts`:

```ts
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
```

- [ ] **Step 4: Run the helper test again and make sure it passes**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma\app
npm run test:training-countdown
```

Expected:

- all three tests pass
- output ends with a passing summary from `tsx --test`

- [ ] **Step 5: Commit the helper and test harness**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma
git add app/package.json app/package-lock.json app/src/screens/trainingCountdown.ts app/src/screens/__tests__/trainingCountdown.test.ts
git commit -m "test: add training countdown helper coverage"
```

### Task 2: Wire the Countdown into `TrainingScreen`

**Files:**
- Modify: `app/src/screens/TrainingScreen.tsx`
- Reuse: `app/src/screens/trainingCountdown.ts`
- Verify with: `app/src/screens/__tests__/trainingCountdown.test.ts`

- [ ] **Step 1: Import the helper and replace the auto-start state with an explicit screen phase**

At the top of `TrainingScreen.tsx`, add the helper import:

```ts
import {
  getNextPhaseAfterPrimaryPress,
  getPrimaryControlLabel,
  isPrimaryControlDisabled,
  runCountdownSequence,
  type CountdownStep,
  type TrainingUiPhase,
} from "./trainingCountdown";
```

Replace the old running state with explicit UI phase state and add countdown animation state:

```ts
const [trainingPhase, setTrainingPhase] = useState<TrainingUiPhase>("initializing");
const [countdownStep, setCountdownStep] = useState<CountdownStep | null>(null);
const [last, setLast] = useState<FormAnalysisResult | null>(null);
const [reps, setReps] = useState(0);
const [statusMsg, setStatusMsg] = useState("正在准备摄像头...");

const countdownOpacity = useRef(new Animated.Value(0)).current;
const countdownScale = useRef(new Animated.Value(0.82)).current;
const countdownTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
const countdownCancelledRef = useRef(false);

const running = trainingPhase === "running";
```

Delete the old line:

```ts
const [running, setRunning] = useState(false);
```

- [ ] **Step 2: Remove the auto-start effect and add countdown-safe helpers**

Keep `startLoop()` and `stopLoop()` small, but update them so only explicit start/resume paths can enter `running`:

```ts
const startLoop = useCallback(() => {
  if (runningRef.current) return;
  runningRef.current = true;
  setTrainingPhase("running");
  setStatusMsg(connected ? "后端训练分析中..." : "当前为演示模式");
  void sendFrame();
  timerRef.current = setInterval(() => {
    void sendFrame();
  }, FRAME_INTERVAL_MS);
}, [connected, sendFrame]);

const stopLoop = useCallback(() => {
  runningRef.current = false;
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}, []);
```

Add countdown cleanup and waiting helpers near `startLoop()`:

```ts
const clearCountdown = useCallback(() => {
  countdownCancelledRef.current = true;
  for (const timer of countdownTimersRef.current) {
    clearTimeout(timer);
  }
  countdownTimersRef.current = [];
  setCountdownStep(null);
}, []);

const waitForCountdownBeat = useCallback((ms: number) => {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      countdownTimersRef.current = countdownTimersRef.current.filter((item) => item !== timer);
      resolve();
    }, ms);
    countdownTimersRef.current.push(timer);
  });
}, []);

const animateCountdownStep = useCallback(
  (step: CountdownStep) => {
    setCountdownStep(step);
    countdownOpacity.setValue(0);
    countdownScale.setValue(step === "Go!" ? 0.72 : 0.82);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(countdownOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(countdownOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(countdownScale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  },
  [countdownOpacity, countdownScale]
);
```

Delete the old auto-start effect completely:

```ts
useEffect(() => {
  if (permission?.granted && cameraInitialized) {
    startLoop();
  }
}, [cameraInitialized, permission?.granted, startLoop]);
```

- [ ] **Step 3: Add explicit ready, countdown, pause, and resume control flow**

Add a first-start countdown function:

```ts
const startCountdown = useCallback(async () => {
  if (!cameraReady || trainingPhase !== "ready_to_start") {
    return;
  }

  countdownCancelledRef.current = false;
  setTrainingPhase("countdown");
  setStatusMsg("跟着倒计时准备开始");
  Speech.stop();

  await runCountdownSequence({
    onStep: async (step) => {
      if (countdownCancelledRef.current) return;
      animateCountdownStep(step);
    },
    speak: async (utterance) => {
      if (!voiceEnabled || countdownCancelledRef.current) return;
      Speech.stop();
      Speech.speak(utterance, { rate: 1, pitch: 1 });
    },
    wait: waitForCountdownBeat,
  });

  if (countdownCancelledRef.current) {
    return;
  }

  setCountdownStep(null);
  startLoop();
}, [
  animateCountdownStep,
  cameraReady,
  startLoop,
  trainingPhase,
  voiceEnabled,
  waitForCountdownBeat,
]);
```

Replace `togglePause` with a primary-action handler that uses the helper and never replays countdown on resume:

```ts
const handlePrimaryAction = useCallback(() => {
  lightHaptic();

  if (isPrimaryControlDisabled(trainingPhase, cameraReady)) {
    return;
  }

  const nextPhase = getNextPhaseAfterPrimaryPress(trainingPhase);

  if (nextPhase === "countdown") {
    void startCountdown();
    return;
  }

  if (nextPhase === "paused") {
    stopLoop();
    setTrainingPhase("paused");
    setStatusMsg("训练已暂停");
    return;
  }

  if (nextPhase === "running") {
    startLoop();
  }
}, [cameraReady, startCountdown, startLoop, stopLoop, trainingPhase]);
```

Update camera readiness so the screen becomes ready instead of auto-starting:

```ts
const handleCameraReady = () => {
  setCameraInitialized(true);
};

useEffect(() => {
  if (permission?.granted && cameraInitialized) {
    setTrainingPhase((current) =>
      current === "initializing" ? "ready_to_start" : current
    );
    setStatusMsg("摄像头已就绪，点击开始训练");
  }
}, [cameraInitialized, permission?.granted]);
```

Update `handleCameraMountError` and `onFinish` so countdown cleanup is always safe:

```ts
const handleCameraMountError = (event: CameraMountError) => {
  clearCountdown();
  stopLoop();
  setTrainingPhase("initializing");
  setCameraInitialized(false);
  setStatusMsg(`摄像头启动失败：${event.message}`);
};

const onFinish = async () => {
  heavyHaptic();
  clearCountdown();
  stopLoop();
  const report = await stopFormSession();
  if (report) {
    navigation.replace("WorkoutReport", { report });
    return;
  }
  navigation.goBack();
};
```

Update the cleanup effect:

```ts
useEffect(() => {
  return () => {
    clearCountdown();
    stopLoop();
    Speech.stop();
    if (soundRef.current) {
      void soundRef.current.unloadAsync();
    }
  };
}, [clearCountdown, stopLoop]);
```

- [ ] **Step 4: Render the overlay and update the primary button labels**

Add a primary label and disabled-state computation above the `return`:

```ts
const primaryActionLabel = getPrimaryControlLabel(trainingPhase);
const primaryActionDisabled = isPrimaryControlDisabled(trainingPhase, cameraReady);
```

Tune the default cue copy so the user sees a start instruction before the first rep:

```ts
const primaryCue =
  trainingPhase === "ready_to_start"
    ? "站稳后点击开始训练，倒计时结束会自动开始计数。"
    : last?.primaryCue ?? last?.correctionText ?? "站在画面中央后开始动作。";

const secondaryCue =
  trainingPhase === "ready_to_start"
    ? "首次开始会播报 1、2、3、Go，暂停后继续不会重复倒计时。"
    : last?.secondaryCue ?? "训练中会持续更新计数、纠错和语音提示。";
```

Render the countdown overlay just before `SafeAreaView`:

```tsx
{countdownStep ? (
  <View pointerEvents="none" style={styles.countdownOverlay}>
    <Animated.Text
      style={[
        styles.countdownText,
        countdownStep === "Go!" && styles.countdownGoText,
        {
          opacity: countdownOpacity,
          transform: [{ scale: countdownScale }],
        },
      ]}
    >
      {countdownStep}
    </Animated.Text>
  </View>
) : null}
```

Update the primary control button:

```tsx
<Pressable
  onPress={handlePrimaryAction}
  disabled={primaryActionDisabled}
  style={[
    styles.controlButton,
    primaryActionDisabled && styles.controlButtonDisabled,
    {
      backgroundColor: running ? "rgba(255,255,255,0.16)" : colors.accent,
    },
  ]}
>
  <Text style={styles.controlText}>{primaryActionLabel}</Text>
</Pressable>
```

Add the new styles at the bottom:

```ts
countdownOverlay: {
  ...StyleSheet.absoluteFillObject,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(8,11,16,0.36)",
},
countdownText: {
  color: "#fff",
  fontSize: 112,
  fontWeight: "900",
  letterSpacing: -4,
  textAlign: "center",
},
countdownGoText: {
  color: colors.accent,
},
controlButtonDisabled: {
  opacity: 0.55,
},
```

- [ ] **Step 5: Run the tests and verify the screen compiles**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma\app
npm run test:training-countdown
npm run typecheck
```

Expected:

- countdown helper tests still pass
- `tsc --noEmit` passes with zero TypeScript errors

- [ ] **Step 6: Manually verify the countdown flow on the running app**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Verify on Expo Go / iOS:

- entering the training page no longer starts counting automatically
- camera-ready state shows `开始训练`
- first tap plays and speaks `1`, `2`, `3`, `Go!`
- counting starts only after `Go!`
- tapping `暂停` stops the loop
- tapping `继续` resumes immediately and does not replay countdown
- ending the session still opens the workout report
- backing out during countdown does not leave hidden background speech or a live timer

- [ ] **Step 7: Commit the screen integration**

Run:

```powershell
Set-Location c:\Users\10084\Desktop\skill-guard_xin\lian_le_ma
git add app/src/screens/TrainingScreen.tsx app/src/screens/trainingCountdown.ts app/src/screens/__tests__/trainingCountdown.test.ts app/package.json app/package-lock.json
git commit -m "feat: add countdown-based training start flow"
```
