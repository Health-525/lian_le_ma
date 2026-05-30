# Unified Backend, Customization, and Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the unified FastAPI business API, full 10-action rep counting, workout summary reporting, customization planning, and voice playback and cloning flow for the mobile app.

**Architecture:** Keep `web_app.py` as the near-term pose-model runtime, but move the app-facing contract into `backend/`. The backend will proxy live training analysis, own planning and summary rules, and coordinate voice playback. The Expo app will switch from direct model access to backend APIs and add the new customization and report surfaces.

**Tech Stack:** Python, FastAPI, SQLAlchemy, Pydantic, Flask model service, React Native Expo, TypeScript, fetch, Minimax HTTP APIs, pytest

---

## File Structure

- Create: `backend/app/api/routes/profile.py`
- Create: `backend/app/api/routes/customization.py`
- Create: `backend/app/api/routes/training.py`
- Create: `backend/app/api/routes/voice.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/providers/form_analysis/live_service.py`
- Create: `backend/app/providers/voice/base.py`
- Create: `backend/app/providers/voice/fallback.py`
- Create: `backend/app/providers/voice/minimax.py`
- Create: `backend/app/services/customization_service.py`
- Create: `backend/app/services/training_service.py`
- Create: `backend/app/services/workout_summary.py`
- Create: `backend/app/services/voice_service.py`
- Create: `backend/app/repositories/profile_repository.py`
- Create: `backend/app/repositories/voice_profile_repository.py`
- Create: `backend/app/repositories/meal_plan_repository.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/models/enums.py`
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/models/orm.py`
- Modify: `backend/app/repositories/__init__.py`
- Modify: `backend/app/deterministic/exercise_catalog.py`
- Modify: `backend/app/deterministic/plan_generator.py`
- Modify: `backend/tests/test_health.py`
- Create: `backend/tests/test_customization_service.py`
- Create: `backend/tests/test_training_routes.py`
- Create: `backend/tests/test_voice_routes.py`
- Create: `backend/tests/test_workout_summary.py`
- Modify: `src/live_coach.py`
- Modify: `web_app.py`
- Modify: `app/App.tsx`
- Modify: `app/src/navigation.ts`
- Modify: `app/src/analysis/index.ts`
- Modify: `app/src/analysis/FormAnalysisProvider.ts`
- Create: `app/src/analysis/BackendCoachProvider.ts`
- Create: `app/src/api/client.ts`
- Create: `app/src/screens/CustomizationScreen.tsx`
- Create: `app/src/screens/PlanResultScreen.tsx`
- Create: `app/src/screens/WorkoutReportScreen.tsx`
- Modify: `app/src/screens/TrainingScreen.tsx`
- Modify: `app/src/screens/VoiceScreen.tsx`
- Modify: `app/src/store/settings.tsx`
- Modify: `app/package.json`
- Modify: `start.ps1`
- Modify: `start.bat`

### Task 1: Backend Contract and Data Model

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/models/enums.py`
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/models/orm.py`
- Modify: `backend/app/main.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/api/routes/profile.py`
- Test: `backend/tests/test_health.py`

- [ ] Add backend settings for model-service URL, Minimax credentials, and voice-output directory.
- [ ] Expand `SupportedExercise` to the full 10-action set used by the app.
- [ ] Extend schemas and ORM models for user profile, meal plan, voice profile, workout summary fields, and richer session reports.
- [ ] Register FastAPI routers and CORS so the Expo app can use `/api/profile/*` and future `/api/*` routes.
- [ ] Run: `pytest backend/tests/test_health.py -q`

### Task 2: Live Training Bridge, 10-Action Counting, and Workout Summary

**Files:**
- Create: `backend/app/providers/form_analysis/live_service.py`
- Create: `backend/app/services/training_service.py`
- Create: `backend/app/services/workout_summary.py`
- Create: `backend/app/api/routes/training.py`
- Modify: `src/live_coach.py`
- Modify: `web_app.py`
- Modify: `backend/app/repositories/session_repository.py`
- Create: `backend/tests/test_training_routes.py`
- Create: `backend/tests/test_workout_summary.py`

- [ ] Write failing tests covering backend training start/frame/stop flow and summary output.
- [ ] Extend `src/live_coach.py` so all 10 app-facing actions expose stable `phase` and `rep_count`.
- [ ] Add new-rep detection metadata and spoken rep-announcement text generation.
- [ ] Implement backend training service state that maps app session ids to model session ids, tracks last spoken event, and accumulates summary metrics.
- [ ] Add conservative calorie estimation and overall score logic based on weight, duration, completed reps, correction rate, and exercise intensity.
- [ ] Expose `/api/training/session/start`, `/api/training/session/frame`, and `/api/training/session/stop`.
- [ ] Run:
  - `pytest backend/tests/test_training_routes.py -q`
  - `pytest backend/tests/test_workout_summary.py -q`

### Task 3: Customization, Training Plan, Meal Guidance, and Attempt Guidance

**Files:**
- Create: `backend/app/repositories/profile_repository.py`
- Create: `backend/app/repositories/meal_plan_repository.py`
- Create: `backend/app/services/customization_service.py`
- Create: `backend/app/api/routes/customization.py`
- Modify: `backend/app/deterministic/exercise_catalog.py`
- Modify: `backend/app/deterministic/plan_generator.py`
- Create: `backend/tests/test_customization_service.py`

- [ ] Write failing tests for customization input validation, 7-day training output, meal guidance output, and conservative attempt guidance.
- [ ] Implement profile persistence and customization payload validation.
- [ ] Extend the deterministic planner with broader exercise coverage and optional recent-load influence.
- [ ] Add rule-based meal guidance and safe `do_not_exceed_kg` output with graceful qualitative fallback.
- [ ] Expose `/api/profile/upsert` and `/api/customization/plan`.
- [ ] Run: `pytest backend/tests/test_customization_service.py -q`

### Task 4: Voice Playback, Clone Voice, and Minimax Integration

**Files:**
- Create: `backend/app/providers/voice/base.py`
- Create: `backend/app/providers/voice/fallback.py`
- Create: `backend/app/providers/voice/minimax.py`
- Create: `backend/app/repositories/voice_profile_repository.py`
- Create: `backend/app/services/voice_service.py`
- Create: `backend/app/api/routes/voice.py`
- Create: `backend/tests/test_voice_routes.py`
- Modify: `backend/app/core/config.py`

- [ ] Write failing tests for voice option listing, fallback synthesis behavior, and clone-voice metadata persistence.
- [ ] Implement a provider abstraction that prefers Minimax when configured and falls back to text-only or local speech metadata when not.
- [ ] Implement voice cloning upload handling and voice metadata persistence without checking secrets into the repo.
- [ ] Add generated audio file storage and URL serving for short training-time playback.
- [ ] Expose `/api/voice/options`, `/api/voice/clone`, and `/api/training/session/voice`.
- [ ] Run: `pytest backend/tests/test_voice_routes.py -q`

### Task 5: Expo App Integration and Launcher

**Files:**
- Modify: `app/App.tsx`
- Modify: `app/src/navigation.ts`
- Modify: `app/src/analysis/index.ts`
- Modify: `app/src/analysis/FormAnalysisProvider.ts`
- Create: `app/src/analysis/BackendCoachProvider.ts`
- Create: `app/src/api/client.ts`
- Create: `app/src/screens/CustomizationScreen.tsx`
- Create: `app/src/screens/PlanResultScreen.tsx`
- Create: `app/src/screens/WorkoutReportScreen.tsx`
- Modify: `app/src/screens/TrainingScreen.tsx`
- Modify: `app/src/screens/VoiceScreen.tsx`
- Modify: `app/src/store/settings.tsx`
- Modify: `app/package.json`
- Modify: `start.ps1`
- Modify: `start.bat`

- [ ] Switch the app from direct `web_app.py` calls to the new backend API client.
- [ ] Add the third bottom tab for customization and wire its form and result screens.
- [ ] Add workout report navigation after a session stop, showing calories, total reps, score, and summary text.
- [ ] Add training-time audio playback and rep announcements, with graceful fallback when generated audio is unavailable.
- [ ] Add clone-voice upload UI and remote voice option fetching.
- [ ] Update the launcher to start `web_app.py`, FastAPI, and Expo together, and write the correct app `.env`.
- [ ] Run:
  - `pytest backend/tests -q`
  - `npm run typecheck` in `app/`

### Task 6: Final Regression Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-05-30-unified-backend-customization-voice-design.md`
- Modify: `docs/superpowers/plans/2026-05-30-unified-backend-customization-voice.md`

- [ ] Re-read the spec and confirm the implemented behavior covers unified backend APIs, 10-action counting, calories and summary reporting, customization planning, and voice support.
- [ ] Run:
  - `pytest backend/tests -q`
  - `python -m pytest backend/tests -q`
  - `npm run typecheck`
- [ ] Document any remaining provider limitations honestly if Minimax credentials or local dependencies block a full runtime check.
