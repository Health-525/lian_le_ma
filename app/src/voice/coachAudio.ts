/**
 * 本地教练语音播放器 —— 防卡顿版。
 *
 * 核心设计：
 *  1. 播放锁：正在播音频时，新请求不打断，直接丢弃或替换队列。
 *  2. 冷却时间：每条播完后至少等 COOLDOWN_MS 才能播下一条。
 *  3. 优先级：纠错(3) > 计数(2) > 鼓励(1)。高优先级替换队列里等待的低优先级，
 *     但不打断正在播的（避免卡顿）。
 *  4. 计数去重：同一 rep 数只播一次。
 */
import { Audio } from "expo-av";
import type { SupportedExercise } from "../types";

// ── 冷却时间（ms）：播完后至少等多久才能播下一条 ──────────────────────
const COOLDOWN_MS = 1200;

// ── 优先级 ────────────────────────────────────────────────────────────────
const PRIO_ENCOURAGE = 1;
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
  // 开场引导
  intro_squat: require("../../assets/audio/intro_squat.mp3"),
  // 计数
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
  // 深蹲标准鼓励（8 条轮播）
  squat_good_1: require("../../assets/audio/squat_good_1.mp3"),
  squat_good_2: require("../../assets/audio/squat_good_2.mp3"),
  squat_good_3: require("../../assets/audio/squat_good_3.mp3"),
  squat_good_4: require("../../assets/audio/squat_good_4.mp3"),
  squat_good_5: require("../../assets/audio/squat_good_5.mp3"),
  squat_good_6: require("../../assets/audio/squat_good_6.mp3"),
  squat_good_7: require("../../assets/audio/squat_good_7.mp3"),
  squat_good_8: require("../../assets/audio/squat_good_8.mp3"),
  // 连续标准里程碑
  squat_streak_3: require("../../assets/audio/squat_streak_3.mp3"),
  squat_streak_5: require("../../assets/audio/squat_streak_5.mp3"),
  squat_streak_8: require("../../assets/audio/squat_streak_8.mp3"),
  squat_streak_10: require("../../assets/audio/squat_streak_10.mp3"),
  // 暂停恢复
  resume_squat: require("../../assets/audio/resume_squat.mp3"),
  // 通用鼓励（其他动作）
  good_form_1: require("../../assets/audio/good_form_1.mp3"),
  good_form_2: require("../../assets/audio/good_form_2.mp3"),
  good_form_3: require("../../assets/audio/good_form_3.mp3"),
  good_form_4: require("../../assets/audio/good_form_4.mp3"),
  good_form_5: require("../../assets/audio/good_form_5.mp3"),
};

// ── 播放状态 ──────────────────────────────────────────────────────────────
let isPlaying = false;
let lastPlayedAt = 0;
let pendingKey: string | null = null;
let pendingPrio = 0;
let currentSound: Audio.Sound | null = null;

// ── 训练状态 ──────────────────────────────────────────────────────────────
let lastAnnouncedRep = 0;
let consecutiveGoodReps = 0;
let squat_good_idx = 0;
const SQUAT_GOOD_FILES = [
  "squat_good_1","squat_good_2","squat_good_3","squat_good_4",
  "squat_good_5","squat_good_6","squat_good_7","squat_good_8",
];
const GOOD_FORM_FILES = [
  "good_form_1","good_form_2","good_form_3","good_form_4","good_form_5",
];
let good_form_idx = 0;

/** 重置训练状态（开始新训练时调用）。 */
export function resetCoachState(): void {
  lastAnnouncedRep = 0;
  consecutiveGoodReps = 0;
  squat_good_idx = 0;
  good_form_idx = 0;
  pendingKey = null;
  pendingPrio = 0;
}

// ── 核心播放引擎 ──────────────────────────────────────────────────────────

/** 把一条语音加入队列（不打断正在播的）。 */
function enqueue(fileKey: string, priority: number): void {
  const source = AUDIO_FILES[fileKey];
  if (!source) return;

  const now = Date.now();

  // 正在播放：只有更高优先级才能替换等待队列（不打断当前播放）
  if (isPlaying) {
    if (priority > pendingPrio) {
      pendingKey = fileKey;
      pendingPrio = priority;
    }
    return;
  }

  // 冷却中：同样只替换等待队列
  if (now - lastPlayedAt < COOLDOWN_MS) {
    if (priority > pendingPrio) {
      pendingKey = fileKey;
      pendingPrio = priority;
    }
    return;
  }

  // 空闲：直接播
  void _play(fileKey);
}

async function _play(fileKey: string): Promise<void> {
  const source = AUDIO_FILES[fileKey];
  if (!source) return;

  isPlaying = true;
  try {
    if (currentSound) {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
    }
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
    currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) currentSound = null;
        isPlaying = false;
        lastPlayedAt = Date.now();
        // 播完后检查是否有等待的语音
        if (pendingKey) {
          const key = pendingKey;
          pendingKey = null;
          pendingPrio = 0;
          // 再等一小段冷却再播（避免连续两条太紧）
          setTimeout(() => void _play(key), 300);
        }
      }
    });
  } catch {
    isPlaying = false;
    lastPlayedAt = Date.now();
  }
}

// ── 计数播报规则 ──────────────────────────────────────────────────────────
function shouldAnnounceRep(rep: number): boolean {
  if (rep <= 10) return true;
  if (rep % 5 === 0) return true;
  return false;
}

function repFileKey(rep: number): string | null {
  const key = `rep_${rep}`;
  return AUDIO_FILES[key] !== undefined ? key : null;
}

// ── 公开 API ──────────────────────────────────────────────────────────────

/** 播放开场引导语音（进入训练页时调用）。 */
export async function playIntro(exercise: SupportedExercise): Promise<void> {
  resetCoachState();
  const key = `intro_${exercise}`;
  if (AUDIO_FILES[key] !== undefined) {
    // 开场语音直接播，不走队列（此时没有其他语音）
    await _play(key);
  }
}

/** 根据模型返回的 speak_text 播放对应的本地教练语音（纠错，最高优先级）。 */
export function playCoachAudio(speakText: string): void {
  const fileKey = TEXT_TO_FILE[speakText.trim()];
  if (!fileKey) return;
  enqueue(fileKey, PRIO_CORRECT);
}

/**
 * 深蹲专用：根据 rep 数和动作是否标准决定播放哪条语音。
 * 优先级：计数(2) > 连续标准鼓励(1) > 纠错(3，由 playCoachAudio 单独调用)。
 */
export function playSquatFeedback(
  rep: number,
  isStandard: boolean,
  speakText?: string
): void {
  // 1. 计数播报（优先级 PRIO_COUNT）
  if (rep > lastAnnouncedRep && shouldAnnounceRep(rep)) {
    lastAnnouncedRep = rep;
    const key = repFileKey(rep);
    if (key) { enqueue(key, PRIO_COUNT); return; }
  }

  if (isStandard) {
    consecutiveGoodReps += 1;
    // 2. 连续标准里程碑
    if (consecutiveGoodReps === 10) {
      enqueue("squat_streak_10", PRIO_ENCOURAGE); return;
    }
    if (consecutiveGoodReps === 8) {
      enqueue("squat_streak_8", PRIO_ENCOURAGE); return;
    }
    if (consecutiveGoodReps === 5) {
      enqueue("squat_streak_5", PRIO_ENCOURAGE); return;
    }
    if (consecutiveGoodReps === 3) {
      enqueue("squat_streak_3", PRIO_ENCOURAGE); return;
    }
    // 3. 每 5 个标准动作随机播一条鼓励（避免太频繁）
    if (consecutiveGoodReps % 5 === 0) {
      const key = SQUAT_GOOD_FILES[squat_good_idx % SQUAT_GOOD_FILES.length]!;
      squat_good_idx += 1;
      enqueue(key, PRIO_ENCOURAGE);
    }
  } else {
    consecutiveGoodReps = 0;
    // 4. 动作不标准 → 纠错话术（最高优先级，由模型 speak_text 驱动）
    if (speakText) playCoachAudio(speakText);
  }
}

/**
 * 其他动作的通用反馈：标准时偶尔鼓励，不标准时播纠错。
 */
export function playGenericFeedback(
  isStandard: boolean,
  speakText?: string
): void {
  if (isStandard) {
    consecutiveGoodReps += 1;
    // 每 6 个标准动作播一条通用鼓励
    if (consecutiveGoodReps % 6 === 0) {
      const key = GOOD_FORM_FILES[good_form_idx % GOOD_FORM_FILES.length]!;
      good_form_idx += 1;
      enqueue(key, PRIO_ENCOURAGE);
    }
  } else {
    consecutiveGoodReps = 0;
    if (speakText) playCoachAudio(speakText);
  }
}

/** 停止当前正在播放的语音并清空队列。 */
export async function stopCoachAudio(): Promise<void> {
  pendingKey = null;
  pendingPrio = 0;
  isPlaying = false;
  if (currentSound) {
    await currentSound.stopAsync().catch(() => {});
    await currentSound.unloadAsync().catch(() => {});
    currentSound = null;
  }
}
