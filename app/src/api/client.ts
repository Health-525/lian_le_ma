import type { UserProfile, VoiceOption } from "../store/settings";
import type { SupportedExercise } from "../types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
  process.env.EXPO_PUBLIC_MODEL_BASE_URL?.trim() ||
  "";

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }
  return API_BASE_URL.replace(/\/$/, "");
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function isBackendConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export interface TrainingStartPayload {
  user_id: string;
  exercise: SupportedExercise;
  mode: "manual" | "auto";
  voice_id?: string;
}

export interface TrainingFramePayload {
  session_id: string;
  image_data: string;
}

export interface TrainingFrameResult {
  session_id: string;
  active_exercise: string;
  rep_count: number;
  rep_delta: number;
  phase?: string;
  status_color?: "idle" | "good" | "warn" | "alert";
  primary_cue?: string;
  secondary_cue?: string;
  correction_text?: string | null;
  speak_text?: string | null;
  audio_url?: string | null;
  speech_text?: string | null;
  errors?: Array<{ code: string; severity: number; cue: string }>;
}

export interface ExerciseBreakdown {
  exercise: SupportedExercise;
  reps: number;
  estimated_calories: number;
}

export interface WorkoutReport {
  session_id: string;
  form_score: number;
  risk_notes: string[];
  correction_count: number;
  next_focus: string;
  summary_text?: string | null;
  total_reps: number;
  duration_seconds: number;
  estimated_calories: number;
  overall_score: number;
  exercise_breakdown: ExerciseBreakdown[];
}

export interface RecentLoadSample {
  exercise: SupportedExercise;
  weight_kg: number;
  reps_completed: number;
}

export interface PlanExercise {
  name: string;
  exercise?: SupportedExercise | null;
  sets: number;
  reps?: number | null;
  duration_sec?: number | null;
  rest_sec: number;
  difficulty: number;
}

export interface PlanDay {
  day_index: number;
  is_rest_day: boolean;
  exercises: PlanExercise[];
}

export interface TrainingPlan {
  user_id: string;
  days: PlanDay[];
  created_at: string;
}

export interface MealPlanDay {
  day_index: number;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_suggestions: string[];
}

export interface MealPlan {
  user_id: string;
  days: MealPlanDay[];
  hydration_note: string;
  created_at: string;
}

export interface AttemptGuidance {
  exercise: SupportedExercise;
  estimated_training_max_kg?: number | null;
  do_not_exceed_kg?: number | null;
  confidence_label: string;
  explanation_note: string;
}

export interface CustomPlanResult {
  profile: {
    user_id: string;
    name: string;
    gender: string;
    age: number | null;
    height_cm: number | null;
    weight_kg: number | null;
    updated_at: string;
  };
  assessment: {
    user_id: string;
    goal: string;
    venue: string;
    equipment: string[];
    weekly_frequency: number;
    injury_risk: string[];
    created_at: string;
  };
  training_plan: TrainingPlan;
  meal_plan: MealPlan;
  attempt_guidance: AttemptGuidance[];
  safety_notes: string[];
  generated_at: string;
}

export interface CustomPlanRequest {
  profile: {
    user_id: string;
    name: string;
    gender: string;
    age: number | null;
    height_cm: number | null;
    weight_kg: number | null;
  };
  assessment: {
    user_id: string;
    goal: string;
    venue: string;
    equipment: string[];
    weekly_frequency: number;
    injury_risk: string[];
  };
  recent_load_samples: RecentLoadSample[];
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const response = await fetch(`${requireBaseUrl()}/api/profile/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: profile.userId,
      name: profile.name,
      gender: profile.gender,
      age: profile.age,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
    }),
  });
  const data = await readJson<{
    user_id: string;
    name: string;
    gender: UserProfile["gender"];
    age: number | null;
    height_cm: number | null;
    weight_kg: number | null;
  }>(response);
  return {
    userId: data.user_id,
    name: data.name,
    gender: data.gender,
    age: data.age,
    heightCm: data.height_cm,
    weightKg: data.weight_kg,
  };
}

export async function generateCustomPlan(
  payload: CustomPlanRequest
): Promise<CustomPlanResult> {
  const response = await fetch(`${requireBaseUrl()}/api/customization/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<CustomPlanResult>(response);
}

export async function startTrainingSession(
  payload: TrainingStartPayload
): Promise<{ session_id: string }> {
  const response = await fetch(`${requireBaseUrl()}/api/training/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<{ session_id: string }>(response);
}

export async function sendTrainingFrame(
  payload: TrainingFramePayload
): Promise<TrainingFrameResult> {
  const response = await fetch(`${requireBaseUrl()}/api/training/session/frame`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<TrainingFrameResult>(response);
}

export async function stopTrainingSession(sessionId: string): Promise<WorkoutReport> {
  const response = await fetch(`${requireBaseUrl()}/api/training/session/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return readJson<WorkoutReport>(response);
}

export async function listVoiceOptions(userId?: string): Promise<VoiceOption[]> {
  const suffix = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  const response = await fetch(`${requireBaseUrl()}/api/voice/options${suffix}`);
  const items = await readJson<
    Array<{
      voice_id: string;
      display_name: string;
      cloned: boolean;
      provider: string;
    }>
  >(response);
  return items.map((item) => ({
    id: item.voice_id,
    name: item.display_name,
    desc: item.cloned ? "克隆音色" : item.provider,
    emoji: item.cloned ? "✨" : "🎙️",
    cloned: item.cloned,
    provider: item.provider,
  }));
}

export async function cloneVoice(
  userId: string,
  displayName: string,
  file: { uri: string; name: string; type?: string | null }
): Promise<VoiceOption> {
  const form = new FormData();
  form.append("user_id", userId);
  form.append("display_name", displayName);
  form.append("sample", file as any);
  const response = await fetch(`${requireBaseUrl()}/api/voice/clone`, {
    method: "POST",
    body: form,
  });
  const item = await readJson<{
    voice_id: string;
    display_name: string;
    provider: string;
  }>(response);
  return {
    id: item.voice_id,
    name: item.display_name,
    desc: "克隆音色",
    emoji: "✨",
    cloned: true,
    provider: item.provider,
  };
}

export function buildAbsoluteAudioUrl(audioUrl: string | null | undefined): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) return audioUrl;
  return `${requireBaseUrl()}${audioUrl}`;
}
