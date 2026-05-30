# Unified Backend, Customization, and Voice Design

Date: 2026-05-30

## Assumed Product Goal

Turn the current demo-style fitness app into a unified mobile product where:

- the mobile app talks to one FastAPI backend for all business flows
- the backend owns planning, nutrition guidance, training sessions, reports, and voice orchestration
- the pose model remains reusable through a provider boundary instead of direct frontend calls
- users can create a personalized 7-day training and meal plan, get a conservative maximum-attempt warning, and hear corrective or encouraging voice playback during training

## Current State

- `app/` already contains a polished Expo mobile UI with `Workout` and `Profile` tabs.
- `TrainingScreen` currently analyzes frames by calling the app-side `ModelCoachProvider`, which directly hits the root-level `web_app.py` service.
- `backend/` already contains:
  - domain schemas in `backend/app/models/schemas.py`
  - enums in `backend/app/models/enums.py`
  - deterministic plan generation in `backend/app/deterministic/plan_generator.py`
  - repositories for assessments, plans, sessions, consent, and entitlements
  - provider namespaces for form analysis, coach text, and voice
- `backend/app/main.py` only exposes a health route today and does not yet serve the app as the single business API.
- The mobile branch already supports 10 model-backed actions in `app/src/types.ts`, while backend `SupportedExercise` still reflects the earlier 4-action scope. This mismatch must be resolved as part of the integration.

## Product Decision

Use a unified-backend approach.

- `app/` becomes a client-only layer responsible for UI, camera capture, local playback, and lightweight view state.
- `backend/` becomes the only business API entry point for the mobile app.
- `web_app.py` remains the near-term pose/model service but is called only from backend providers, never directly from the mobile app.
- Minimax is integrated only through backend voice providers and environment variables.
- Numeric decisions remain deterministic and explainable. Generative systems may improve wording or voice output, but must not decide the plan, meal targets, or load ceilings.

This approach costs more in the first pass than a partial integration, but it prevents the product from splitting into multiple permanent API contracts and keeps future work on history, reports, paywall, and audio features consistent.

## Scope

In scope for this iteration:

- promote FastAPI to the sole app-facing business API
- route live training frame analysis through backend provider boundaries
- add a new `Customization` tab between `Workout` and `Profile`
- collect extended user inputs for planning:
  - age
  - sex or gender selection
  - height and weight
  - training goal
  - weekly training frequency
  - venue and equipment
  - injury-risk self-report
  - recent completed load and reps for supported lifts when available
- generate a 7-day training plan
- generate a 7-day meal guidance plan
- generate a conservative "do not exceed" maximum attempt recommendation
- add system voice playback, Minimax voice playback, and cloned-voice support
- add intermittent encouragement during training with cooldown rules
- persist user profile, voice preference, training sessions, generated plans, and voice-clone metadata

Out of scope for this iteration:

- medical diagnosis
- rehabilitation prescriptions
- autonomous nutrition treatment for disease conditions
- aggressive one-rep-max coaching or PR recommendations
- replacing the pose stack with a new inference engine
- background workers, distributed queues, or full media CDN infrastructure

## Architecture

### Top-level structure

The product is split into four bounded feature areas:

1. `Training`
   - live camera frames
   - pose analysis
   - correction cues
   - encouragement timing
   - session persistence
   - end-of-session reporting
2. `Customization`
   - user physical profile
   - goal and environment inputs
   - 7-day training plan
   - 7-day nutrition guidance
   - conservative load ceiling output
3. `Voice`
   - voice option listing
   - standard TTS playback
   - cloned-voice registration
   - training-time cue and encouragement synthesis
4. `User`
   - profile editing
   - settings
   - selected voice
   - training history

### Runtime boundaries

- Mobile app
  - captures frames and uploads them to backend
  - renders plan, report, and history screens
  - plays audio returned from backend
- FastAPI backend
  - validates requests
  - owns business rules
  - calls repositories
  - calls deterministic planners
  - calls the pose-analysis provider
  - calls the voice provider
- Root `web_app.py` model service
  - remains the immediate pose/model runtime
  - exposes the existing session start, frame, and stop contract
  - is wrapped by a backend provider so the mobile app never depends on it directly

### Provider strategy

Add or expand provider interfaces under `backend/app/providers/`:

- `form_analysis`
  - `StubFormProvider` remains useful for tests and fallback demos
  - add a real provider that talks to `web_app.py`
- `voice`
  - add a provider contract for:
    - list voices
    - clone voice
    - synthesize correction cue
    - synthesize encouragement cue
- `coach_text`
  - optional wording polish layer only
  - cannot change deterministic numeric outputs

## Backend API Contract

FastAPI becomes the app-facing surface. All routes live under `/api`.

### Profile

- `POST /api/profile/upsert`
  - request:
    - user identifier or locally persisted app user id
    - name
    - gender
    - age
    - height_cm
    - weight_kg
  - response:
    - normalized saved profile
    - BMI summary
    - validation warnings if values are unusual but still accepted

### Customization and planning

- `POST /api/customization/plan`
  - request:
    - profile
    - training goal
    - weekly frequency
    - venue
    - equipment list
    - injury risk areas
    - recent load samples
  - response:
    - 7-day training plan
    - 7-day meal guidance
    - conservative maximum-attempt guidance
    - safety notes
    - generation timestamp

### Training session lifecycle

- `POST /api/training/session/start`
  - request:
    - user id
    - selected exercise
    - analysis mode
    - chosen voice id
  - response:
    - backend session id
    - model session id if applicable
    - display label
    - startup tip

- `POST /api/training/session/frame`
  - request:
    - backend session id
    - image data
    - client frame timestamp
  - response:
    - rep count
    - phase
    - status color
    - correction cue
    - secondary cue
    - speak text if needed
    - whether audio should be played now
    - optional voice playback payload or audio URL
    - encouragement metadata for logging

- `POST /api/training/session/voice`
  - request:
    - session id
    - type: `correction` or `encouragement`
    - text
    - chosen voice id
  - response:
    - playback asset reference
    - mime type
    - cache key

- `POST /api/training/session/stop`
  - request:
    - session id
  - response:
    - report summary
    - form score
    - correction count
    - next-focus text
    - persisted report id

### Voice

- `GET /api/voice/options`
  - response:
    - built-in system voice entries
    - Minimax standard voice entries if configured
    - user-specific cloned voice entries

- `POST /api/voice/clone`
  - request:
    - user id
    - sample audio upload
    - display name
  - response:
    - stored voice id
    - provider voice id
    - status
    - failure reason if cloning is rejected

### History

- `GET /api/training/history`
  - request:
    - user id
    - page cursor or page number
  - response:
    - sessions sorted newest first
    - report summaries
    - pagination metadata

## Data Model Changes

### Extend existing backend schemas

The current backend models already cover assessments, training plans, sessions, voice commands, and reports. Extend them instead of inventing parallel objects.

Add new or expanded data shapes for:

- `UserProfile`
  - name
  - gender
  - age
  - height_cm
  - weight_kg
- `RecentLoadSample`
  - exercise
  - weight_kg
  - reps_completed
  - recorded_at
- `MealPlanDay`
  - day index
  - calorie target
  - protein target
  - carb target
  - fat target
  - meal suggestions
- `MealPlan`
  - user id
  - 7 daily entries
  - hydration note
- `AttemptGuidance`
  - exercise
  - estimated_training_max_kg
  - do_not_exceed_kg
  - confidence label
  - explanation note
- `VoiceProfile`
  - local voice id
  - provider type
  - provider voice id
  - display name
  - cloned flag
  - owner user id

### Exercise alignment

Backend `SupportedExercise` must be expanded from the old 4-action scope to match the app branch and current model-backed action mapping:

- squat
- lunge
- push_up
- dumbbell_shoulder_press
- dumbbell_rows
- bicep_curls
- situps
- tricep_extensions
- lateral_shoulder_raises
- jumping_jacks

The backend does not need equally rich deterministic load guidance for every movement on day one. When a user provides no relevant load sample, the API should return qualitative guidance instead of fabricated weight numbers.

## Deterministic Rules

### Training plan

Reuse and extend `backend/app/deterministic/plan_generator.py`.

Rules remain deterministic:

- exactly 7 days
- number of training days equals weekly frequency
- exercises respect venue and equipment
- exercises avoid declared injury-risk areas
- prescription shifts by goal

Extend the generator to optionally use body metrics and recent load samples for:

- difficulty calibration
- lower or higher default volume
- exercise substitution notes

### Meal guidance

Meal guidance remains rule-based, not LLM-generated.

Generate:

- daily calorie target using conservative maintenance formulas and goal-based deltas
- daily macro targets with simple explainable rules
- Chinese-friendly example meal suggestions rather than rigid prescription menus
- safety note when user inputs are too incomplete for precise calorie estimates

If the user supplies too little data, the backend should still return a valid 7-day meal structure, but with coarse ranges and an explicit confidence disclaimer.

### Maximum-attempt guidance

This feature must be conservative by design.

Rules:

- only compute a numeric output when the user provides a recent load and reps sample for a compatible movement
- estimate a rough ceiling from a conservative variant of standard rep-max formulas
- apply a safety reduction before exposing any number to the user
- return `do_not_exceed_kg`, not a hype-style "go lift this" target
- if confidence is low, return a category recommendation such as:
  - bodyweight only
  - empty bar only
  - light dumbbell range

The UI and API wording must avoid encouraging risky testing behavior.

## Voice Design

### Voice sources

Support three voice categories:

1. device or system voice
2. provider standard voices
3. user-cloned voices

The selected voice id is stored in backend-backed user settings so the app can recover it across sessions.

### Minimax integration

Minimax is used only from the backend.

Requirements:

- API key is loaded from environment variables
- the key must never be written to source-controlled files
- request and response logging must redact secrets
- if the key previously appeared in chat, screenshots, or other shared channels, rotate it before production use

### Voice cloning

Cloning flow:

1. user uploads sample audio from the app
2. backend validates duration, format, and ownership
3. backend submits the sample to Minimax
4. backend stores provider voice metadata locally
5. cloned voice becomes available through `GET /api/voice/options`

If cloning fails, the user should still be able to use system or standard provider voices without breaking the training flow.

### Training-time playback

The backend decides whether playback should occur for a given frame response.

Two playback classes:

- correction playback
- encouragement playback

The frontend should not invent encouragement timing by itself. It only obeys backend playback instructions and renders state.

## Encouragement Policy

Encouragement should feel human, not noisy.

Trigger candidates:

- the user recovers from `warn` or `alert` to `good`
- the user completes a meaningful rep milestone
- the user maintains a standard form streak
- a long silent interval passes during an active set

Cooldown rules:

- enforce a minimum time gap between spoken events
- never stack an encouragement immediately after a correction cue
- suppress duplicate cue text
- prefer silence over spam when confidence is low

This is intentionally pseudo-random rather than truly random. The backend may vary timing inside safe windows, but the experience must remain bounded and testable.

## Frontend Design

### Tab structure

Change the bottom tab bar from two entries to three:

1. `Workout`
2. `Customization`
3. `Profile`

### Screen structure

`Workout`

- `PickScreen`
- `TrainingScreen`
- optional next-step `ReportScreen`

`Customization`

- `CustomizeFormScreen`
- `PlanResultScreen`

`Profile`

- `ProfileScreen`
- `EditProfileScreen`
- `SettingsScreen`
- `VoiceScreen`

### Frontend responsibilities

- collect form input
- upload training frames
- display backend-derived analysis results
- play returned audio
- cache the most recent plan for quick viewing
- show meaningful empty states when voice cloning or plan generation is unavailable

The app must stop calling the root model server directly once backend training endpoints are live.

## Persistence

Persist and query at least the following:

- user profile
- fitness or customization assessment
- generated training plans
- generated meal plans
- maximum-attempt guidance snapshot tied to the plan request
- training sessions
- per-session analysis summary
- voice command events
- voice profile metadata

The initial implementation can store small audio references and provider ids without building a large media asset pipeline.

## Error Handling

### Backend unavailable

- app shows a stable offline or degraded-state message
- training falls back to demo analysis only if explicitly configured
- customization pages show retry affordances instead of partial garbage

### Provider unavailable

- if pose provider fails, return a safe inconclusive result rather than fake corrective certainty
- if Minimax fails, fall back to system voice or text-only feedback
- if voice cloning fails, preserve the rest of the user settings and training flow

### Input quality issues

- reject impossible body measurements
- accept incomplete recent-load data but lower confidence and remove numeric ceiling output
- surface safety notes for injury risk rather than pretending the plan is fully personalized

## Security and Privacy

- keep Minimax secrets in environment variables only
- redact provider credentials from logs and exceptions
- treat injury-risk data as sensitive profile data
- avoid persisting raw camera frames by default
- persist only the metadata needed for reports and debugging unless explicit media retention is later designed

## Testing Strategy

### Backend

- unit tests for:
  - expanded schema validation
  - training plan generation
  - meal guidance generation
  - maximum-attempt guidance rules
  - encouragement timing policy
  - voice-provider fallback behavior
- API tests for:
  - profile upsert
  - customization plan generation
  - training session start, frame, and stop
  - voice clone and voice option listing
  - history listing

### Frontend

- component and integration coverage for:
  - new 3-tab navigation
  - customization form validation
  - plan results rendering
  - voice selection states
  - training playback instructions from backend

### End-to-end confidence checks

- app can generate a plan and meal guidance from realistic inputs
- app can start a training session through backend instead of direct model access
- app can receive at least one correction cue and one encouragement cue
- app can select a cloned voice when available and gracefully fall back when not

## Delivery Order

Implement in three phases, but within one unified architecture:

### Phase A: Unified backend contract

- add FastAPI routes
- move live training traffic behind backend
- align exercise enums
- persist profile and session basics

### Phase B: Customization

- add `Customization` tab and forms
- generate 7-day training and meal guidance
- generate conservative maximum-attempt output

### Phase C: Voice

- add standard voice playback via backend
- add encouragement timing logic
- add Minimax cloned voice flow

This preserves the recommended order from the design discussion while keeping all work on the same long-term architecture.
