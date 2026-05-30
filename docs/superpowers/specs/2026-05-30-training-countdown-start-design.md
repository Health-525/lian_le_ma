# Training Countdown Start Design

Date: 2026-05-30

## Assumed Product Goal

Add a safer and more polished training start experience where the user manually begins a workout, sees a short `1, 2, 3, Go!` countdown, hears matching voice prompts, and only then enters live rep counting.

The change must be safe to merge into the current app without breaking:

- existing training-session APIs
- current rep-counting behavior after training actually starts
- pause, resume, and finish flows
- workout report generation
- current voice cue logic during active training

## Current State

- `app/src/screens/TrainingScreen.tsx` starts the frame-analysis loop automatically once camera permission is granted and the camera is initialized.
- The screen already supports:
  - camera readiness handling
  - pause and resume
  - live rep counting
  - correction cues
  - training-end report navigation
  - speech playback for training feedback
- No explicit pre-start state exists today.
- There is no animated training-start overlay.
- There is no dedicated countdown voice path before the training loop begins.

## Product Decision

Use a frontend-only countdown start flow.

- The training page should wait in a `ready_to_start` state after camera initialization.
- The user explicitly taps `开始训练`.
- The app plays a local countdown sequence: `1`, `2`, `3`, `Go!`
- Each step is shown as a large centered animation and spoken with local `expo-speech`.
- Only after the countdown completes does the existing frame-analysis loop start.
- Pause/resume behavior remains unchanged except that resume should not replay the countdown.

This is the safest merge strategy because it changes only the training-page state flow and presentation layer. It does not require backend schema changes, API changes, or changes to session-report logic.

## Scope

In scope:

- add an explicit pre-start state to the training screen
- replace automatic training start with a manual `开始训练` action
- add a full-screen visual countdown overlay
- add local spoken countdown prompts for `1`, `2`, `3`, `Go!`
- start the existing analysis loop only after countdown completion
- preserve direct resume behavior after pause
- keep the implementation small enough for direct merge into the current branch

Out of scope:

- backend countdown orchestration
- storing countdown state in any API or database
- using Minimax or cloned voice for the countdown itself
- replaying countdown on resume
- changing current rep-counting heuristics
- changing training report formulas or session summary behavior

## User Experience

### First entry into training

1. User enters the training page.
2. Camera initializes as it does today.
3. The screen shows a ready state instead of immediately starting analysis.
4. The primary action button shows `开始训练`.
5. User taps `开始训练`.
6. A centered animated countdown runs: `1` -> `2` -> `3` -> `Go!`
7. Local speech announces each step.
8. When `Go!` completes, the existing training loop starts.
9. The primary action button switches to `暂停`.

### Pause and resume

1. User taps `暂停`.
2. Training loop stops exactly as it does today.
3. Primary button switches to `继续`.
4. User taps `继续`.
5. Training loop resumes immediately.
6. Countdown does not replay.

### Finish

Finish behavior remains exactly the same as the current implementation.

## UI Design

### Countdown overlay

The training screen gains a temporary overlay above the existing camera and status UI:

- semi-transparent dark scrim
- large centered countdown text
- strong scale + fade animation
- `Go!` uses the brightest accent treatment in the sequence

The overlay is visual only and should not destroy or unmount the existing training UI underneath it.

### Buttons

The main control button becomes stateful:

- before first start: `开始训练`
- during active training: `暂停`
- after pause: `继续`

The finish button remains separate and unchanged.

## State Design

The screen should move through these high-level states:

1. `initializing`
   - waiting for camera permission or camera readiness
2. `ready_to_start`
   - camera is ready, training has not started yet
3. `countdown`
   - visual and spoken countdown is running
4. `running`
   - current frame-analysis loop is active
5. `paused`
   - loop is stopped but session remains resumable

Required transition rules:

- `initializing -> ready_to_start` when camera is ready
- `ready_to_start -> countdown` on first-tap start
- `countdown -> running` when countdown completes
- `running -> paused` on pause
- `paused -> running` on resume
- `running|paused -> finished` on end-of-session flow

Important safety rule:

- `startLoop()` must never be called automatically from camera readiness anymore.
- It may only run:
  - after countdown completion
  - or after resume from paused state

## Voice Design

Countdown speech should use local `expo-speech` only.

Reasons:

- avoids any new backend dependency
- avoids coupling countdown behavior to network availability
- avoids interfering with Minimax or cloned-voice training cues
- keeps merge risk low

Speech rules:

- speak `1`, `2`, `3`, and `Go`
- stop any residual speech before starting countdown speech
- do not mix countdown speech with training cue speech
- once countdown ends, normal cue playback resumes under existing logic

## Error Handling

- If camera is not ready, `开始训练` must remain disabled.
- If local speech fails, the visual countdown should still continue and training should still start.
- If the user leaves the screen during countdown:
  - clear countdown timers
  - stop any countdown speech
  - do not start the training loop afterward
- If the user taps rapidly during countdown:
  - ignore duplicate start actions
  - keep a single countdown sequence active

## Merge-Safety Constraints

To keep the change safe for direct merge:

- do not change backend routes
- do not change request or response payloads
- do not change report screen contracts
- do not change exercise-counting algorithms
- keep the work primarily inside `app/src/screens/TrainingScreen.tsx`
- allow at most a tiny local helper extraction if it clearly reduces risk

## Testing Strategy

### Static verification

- `npm run typecheck`

### Behavioral verification

- training page opens and waits in `开始训练` state
- first tap plays `1, 2, 3, Go!`
- analysis loop starts only after countdown completes
- rep counting still works once running
- pause stops the loop
- resume restarts the loop without replaying countdown
- finish still navigates to workout report
- leaving the page during countdown does not start training in the background

## Implementation Notes

Implementation should prefer minimal diff over architectural expansion.

Recommended approach:

- add explicit UI state for pre-start and countdown
- reuse existing `startLoop()` and `stopLoop()` with tighter entry conditions
- manage countdown sequencing with a small timer array or staged async helper
- keep all countdown cleanup in the existing unmount cleanup path

This preserves the current training system while improving the first-start experience in a way that is easy to review and merge.
