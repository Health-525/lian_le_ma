/**
 * 本地教练语音播放器 —— 清晰逻辑版。
 *
 * 设计原则：
 *  1. 播放锁：正在播时不打断，新请求进队列或丢弃。
 *  2. 冷却：播完后等 COOLDOWN_MS 再播下一条，避免连续轰炸。
 *  3. 优先级：纠错(3) > 计数(2) > 鼓励(1)。
 *     高优先级替换队列里等待的低优先级，但不打断正在播的。
 *  4. 同帧互斥：计数帧不触发鼓励，避免同一帧双触发。
 *  5. intro 屏蔽：intro 播完之前，只允许纠错，屏蔽计数和鼓励。
 */
import { Audio } from "expo-av";
import type { SupportedExercise } from "../types";

// ── 常量 ──────────────────────────────────────────────────────────────────
const COOLDOWN_MS    = 1200;  // 两条语音之间的最小间隔
const PRIO_COUNT     = 2;
const PRIO_CORRECT   = 3;

// ── 话术文本 → 文件名映射 ──────────────────────────────────────────────────
const TEXT_TO_FILE: Record<string, string> = {
  "请站到画面中央，让全身尽量完整入镜。": "no_person",
  "这一下很稳，继续保持现在的节奏。": "good_rep",
  "膝盖向外打开，跟着脚尖方向走。": "squat_knees_out",
  "再蹲深一点，起身前把重心坐下去。": "squat_depth",
  "把胸口立起来，别让上身塌下去。": "squat_chest_up",
  "步子再迈大一点，前后站距要更开。": "lunge_stride",
  "上身保持挺直，胸口叠在髋部上方。": "lunge_torso",
  "前膝保持稳定，尽量对准脚尖方向。": "lunge_stack",
  "身体尽量保持一条线，别塌腰也别撅臀。": "pushup_line",
  "手肘再收一点，贴近身体发力。": "pushup_elbows",
  "胸口再下去一点，把底部动作做完整。": "pushup_depth",
  "顶端再推高一点，把手臂完全伸直。": "press_lockout",
  "核心收紧，肋骨别外翻，别往后仰。": "press_ribs",
  "手臂路径保持在身体中线，推到头顶正上方。": "press_path",
  "手肘贴近肋部向后拉，不要外张太多。": "row_elbows",
  "拉得再深一点，把重量带向身体侧面。": "row_pull",
  "躯干保持稳定，别在划船时来回晃动。": "row_torso",
  "把手肘钉住，尽量贴近身体两侧。": "curl_elbows",
  "顶端再收紧一点，把弯举做完整。": "curl_finish",
  "保持稳定节奏，起身和回落都顺一些。": "generic_situps",
  "手肘尽量稳定，上臂不要晃太多。": "generic_tricep_extensions",
  "抬手节奏放稳，左右两边尽量同高。": "generic_lateral_shoulder_raises",
  "保持稳定节奏，落地轻一点，身体别晃。": "generic_jumping_jacks",
  "先保持动作稳定，站在画面中央等待识别。": "generic_other",
  "节奏很稳，继续保持！": "encourage_3",
  "五个了，状态不错，继续！": "encourage_5",
  "十个！保持这个节奏，你很棒！": "encourage_10",
};

// ── 音频文件 require 映射（Metro 要求静态 require）────────────────────────
const AUDIO_FILES: Record<string, number> = {
  no_person: require("../../assets/audio/no_person.mp3"),
  good_rep: require("../../assets/audio/good_rep.mp3"),
  squat_knees_out: require("../../assets/audio/squat_knees_out.mp3"),
  squat_depth: require("../../assets/audio/squat_depth.mp3"),
  squat_chest_up: require("../../assets/audio/squat_chest_up.mp3"),
  lunge_stride: require("../../assets/audio/lunge_stride.mp3"),
  lunge_torso: require("../../assets/audio/lunge_torso.mp3"),
  lunge_stack: require("../../assets/audio/lunge_stack.mp3"),
  pushup_line: require("../../assets/audio/pushup_line.mp3"),
  pushup_elbows: require("../../assets/audio/pushup_elbows.mp3"),
  pushup_depth: require("../../assets/audio/pushup_depth.mp3"),
  press_lockout: require("../../assets/audio/press_lockout.mp3"),
  press_ribs: require("../../assets/audio/press_ribs.mp3"),
  press_path: require("../../assets/audio/press_path.mp3"),
  row_elbows: require("../../assets/audio/row_elbows.mp3"),
  row_pull: require("../../assets/audio/row_pull.mp3"),
  row_torso: require("../../assets/audio/row_torso.mp3"),
  curl_elbows: require("../../assets/audio/curl_elbows.mp3"),
  curl_finish: require("../../assets/audio/curl_finish.mp3"),
  generic_situps: require("../../assets/audio/generic_situps.mp3"),
  generic_tricep_extensions: require("../../assets/audio/generic_tricep_extensions.mp3"),
  generic_lateral_shoulder_raises: require("../../assets/audio/generic_lateral_shoulder_raises.mp3"),
  generic_jumping_jacks: require("../../assets/audio/generic_jumping_jacks.mp3"),
  generic_other: require("../../assets/audio/generic_other.mp3"),
  encourage_3: require("../../assets/audio/encourage_3.mp3"),
  encourage_5: require("../../assets/audio/encourage_5.mp3"),
  encourage_10: require("../../assets/audio/encourage_10.mp3"),
  intro_squat: require("../../assets/audio/intro_squat.mp3"),
  rep_1: require("../../assets/audio/rep_1.mp3"),
  rep_2: require("../../assets/audio/rep_2.mp3"),
  rep_3: require("../../assets/audio/rep_3.mp3"),
  rep_4: require("../../assets/audio/rep_4.mp3"),
  rep_5: require("../../assets/audio/rep_5.mp3"),
  rep_6: require("../../assets/audio/rep_6.mp3"),
  rep_7: require("../../assets/audio/rep_7.mp3"),
  rep_8: require("../../assets/audio/rep_8.mp3"),
  rep_9: require("../../assets/audio/rep_9.mp3"),
  rep_10: require("../../assets/audio/rep_10.mp3"),
  rep_15: require("../../assets/audio/rep_15.mp3"),
  rep_20: require("../../assets/audio/rep_20.mp3"),
  rep_25: require("../../assets/audio/rep_25.mp3"),
  rep_30: require("../../assets/audio/rep_30.mp3"),
  rep_35: require("../../assets/audio/rep_35.mp3"),
  rep_40: require("../../assets/audio/rep_40.mp3"),
  rep_45: require("../../assets/audio/rep_45.mp3"),
  rep_50: require("../../assets/audio/rep_50.mp3"),
  squat_good_1: require("../../assets/audio/squat_good_1.mp3"),
  squat_good_2: require("../../assets/audio/squat_good_2.mp3"),
  squat_good_3: require("../../assets/audio/squat_good_3.mp3"),
  squat_good_4: require("../../assets/audio/squat_good_4.mp3"),
  squat_good_5: require("../../assets/audio/squat_good_5.mp3"),
  squat_good_6: require("../../assets/audio/squat_good_6.mp3"),
  squat_good_7: require("../../assets/audio/squat_good_7.mp3"),
  squat_good_8: require("../../assets/audio/squat_good_8.mp3"),
  squat_streak_3: require("../../assets/audio/squat_streak_3.mp3"),
  squat_streak_5: require("../../assets/audio/squat_streak_5.mp3"),
  squat_streak_8: require("../../assets/audio/squat_streak_8.mp3"),
  squat_streak_10: require("../../assets/audio/squat_streak_10.mp3"),
  resume_squat: require("../../assets/audio/resume_squat.mp3"),
  good_form_1: require("../../assets/audio/good_form_1.mp3"),
  good_form_2: require("../../assets/audio/good_form_2.mp3"),
  good_form_3: require("../../assets/audio/good_form_3.mp3"),
  good_form_4: require("../../assets/audio/good_form_4.mp3"),
  good_form_5: require("../../assets/audio/good_form_5.mp3"),
};

// ── 播放引擎状态 ──────────────────────────────────────────────────────────
let isPlaying    = false;
let lastPlayedAt = 0;
let pendingKey: string | null = null;
let pendingPrio  = 0;
let currentSound: Audio.Sound | null = null;

// ── 训练状态 ──────────────────────────────────────────────────────────────
let introPlaying       = false;  // intro 播放期间屏蔽计数/鼓励
let lastAnnouncedRep   = 0;      // 上次播报的 rep 数（去重）

// ── 重置 ──────────────────────────────────────────────────────────────────
export function resetCoachState(): void {
  introPlaying     = false;
  lastAnnouncedRep = 0;
  pendingKey       = null;
  pendingPrio      = 0;
}

// ── 核心播放引擎 ──────────────────────────────────────────────────────────

function enqueue(fileKey: string, priority: number): void {
  if (!AUDIO_FILES[fileKey]) return;
  const now = Date.now();

  if (isPlaying || now - lastPlayedAt < COOLDOWN_MS) {
    // 正在播或冷却中：高优先级替换等待队列，不打断当前
    if (priority > pendingPrio) {
      pendingKey  = fileKey;
      pendingPrio = priority;
    }
    return;
  }
  void _play(fileKey);
}

async function _play(fileKey: string): Promise<void> {
  if (!AUDIO_FILES[fileKey]) return;
  isPlaying = true;
  try {
    if (currentSound) {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
    const { sound } = await Audio.Sound.createAsync(AUDIO_FILES[fileKey]!, { shouldPlay: true });
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) currentSound = null;
        isPlaying    = false;
        lastPlayedAt = Date.now();
        // 播完后若有等待的语音，延迟 300ms 再播
        if (pendingKey) {
          const key   = pendingKey;
          pendingKey  = null;
          pendingPrio = 0;
          setTimeout(() => void _play(key), 300);
        }
      }
    });
  } catch {
    isPlaying    = false;
    lastPlayedAt = Date.now();
  }
}

// ── 计数规则 ──────────────────────────────────────────────────────────────
/** 哪些 rep 数需要播报。 */
function shouldAnnounceRep(rep: number): boolean {
  return rep <= 10 || rep % 5 === 0;
}

function repFileKey(rep: number): string | null {
  const key = `rep_${rep}`;
  return AUDIO_FILES[key] ? key : null;
}

// ── 公开 API ──────────────────────────────────────────────────────────────

/** 播放开场引导（进入训练页时调用）。返回 Promise，在 intro 播完后 resolve。 */
export function playIntro(exercise: SupportedExercise): Promise<void> {
  resetCoachState();
  const key = `intro_${exercise}`;
  if (!AUDIO_FILES[key]) return Promise.resolve();

  introPlaying = true;
  return new Promise<void>((resolve) => {
    void _play(key);
    // 每 200ms 检测一次 intro 是否播完，播完后 resolve 并解除屏蔽
    const timer = setInterval(() => {
      if (!isPlaying) {
        introPlaying = false;
        clearInterval(timer);
        resolve();
      }
    }, 200);
  });
}

/**
 * 深蹲专用反馈。每帧调用一次。
 *
 * 逻辑：
 *  1. intro 播放中 → 全部屏蔽
 *  2. rep 增加且需要播报 → 播计数（本帧不再播 speak_text，避免叠音）
 *  3. 模型有 speak_text → 直接播（纠错或鼓励由模型决定）
 */
export function playSquatFeedback(
  rep: number,
  speakText?: string
): void {
  // ── 1. intro 屏蔽 ──
  if (introPlaying) return;

  // ── 2. 计数播报（rep 增加时） ──
  const isNewRep = rep > lastAnnouncedRep;
  if (isNewRep && shouldAnnounceRep(rep)) {
    lastAnnouncedRep = rep;
    const key = repFileKey(rep);
    if (key) { enqueue(key, PRIO_COUNT); return; }  // 计数帧不再播 speak_text
  }

  // ── 3. 模型 speak_text（纠错 or 鼓励，由模型决定） ──
  if (speakText) {
    const fileKey = TEXT_TO_FILE[speakText.trim()];
    if (fileKey) enqueue(fileKey, PRIO_CORRECT);
  }
}

/**
 * 其他动作通用反馈。
 * 计数 + 直接播模型 speak_text（纠错或鼓励由模型决定）。
 */
export function playGenericFeedback(
  rep: number,
  speakText?: string
): void {
  if (introPlaying) return;

  // 计数
  if (rep > lastAnnouncedRep && shouldAnnounceRep(rep)) {
    lastAnnouncedRep = rep;
    const key = repFileKey(rep);
    if (key) { enqueue(key, PRIO_COUNT); return; }
  }

  // 模型 speak_text
  if (speakText) {
    const fileKey = TEXT_TO_FILE[speakText.trim()];
    if (fileKey) enqueue(fileKey, PRIO_CORRECT);
  }
}

/** 停止当前语音并清空队列。 */
export async function stopCoachAudio(): Promise<void> {
  pendingKey   = null;
  pendingPrio  = 0;
  isPlaying    = false;
  introPlaying = false;
  if (currentSound) {
    await currentSound.stopAsync().catch(() => {});
    await currentSound.unloadAsync().catch(() => {});
    currentSound = null;
  }
}
