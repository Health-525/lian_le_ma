from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
import math
import time
import uuid

import numpy as np


EXERCISES = {
    "squat": {
        "label": "深蹲",
        "tip": "全身进入画面，脚尖和膝盖方向一致。",
    },
    "lunge": {
        "label": "弓步",
        "tip": "前后脚都要拍到，保持上身稳定。",
    },
    "pushup": {
        "label": "俯卧撑",
        "tip": "尽量侧身拍摄，肩髋踝保持一条线。",
    },
    "press": {
        "label": "推举",
        "tip": "全身站立入镜，手臂顶部不要被裁切。",
    },
}

CUE_LIBRARY = {
    "squat_knees_out": "Knees out | 膝盖别内扣",
    "squat_depth": "Go deeper | 再蹲深一点",
    "squat_chest_up": "Chest up | 胸口立住",
    "lunge_stride": "Take a longer stride | 步子再长一点",
    "lunge_torso": "Stay tall | 上身再立一点",
    "lunge_stack": "Front knee steady | 前膝对准脚尖",
    "pushup_line": "Stay in one line | 身体保持一条线",
    "pushup_elbows": "Tuck the elbows | 手肘别外飞",
    "pushup_depth": "Lower the chest | 再下一点",
    "press_lockout": "Finish the lockout | 手臂完全伸直",
    "press_ribs": "Ribs down | 核心收紧别后仰",
    "press_path": "Stack over midfoot | 手臂保持中线",
    "no_person": "Step into frame | 站到画面中央",
}


@dataclass
class LiveCoachSession:
    session_id: str
    exercise: str
    started_at: float
    phase: str = "ready"
    rep_count: int = 0
    last_metric: float | None = None
    seen_bottom: bool = False
    error_streaks: dict[str, int] = field(default_factory=dict)
    last_spoken_at: dict[str, float] = field(default_factory=dict)
    error_totals: Counter = field(default_factory=Counter)
    recent_cues: list[str] = field(default_factory=list)


class LiveCoachSessionStore:
    def __init__(self):
        self._sessions: dict[str, LiveCoachSession] = {}

    def start(self, exercise: str, now: float | None = None) -> LiveCoachSession:
        if exercise not in EXERCISES:
            raise ValueError(f"Unknown exercise: {exercise}")

        session = LiveCoachSession(
            session_id=uuid.uuid4().hex,
            exercise=exercise,
            started_at=now or time.time(),
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> LiveCoachSession:
        if session_id not in self._sessions:
            raise KeyError(session_id)
        return self._sessions[session_id]

    def stop(self, session_id: str) -> LiveCoachSession:
        if session_id not in self._sessions:
            raise KeyError(session_id)
        return self._sessions.pop(session_id)


class LiveCoachEngine:
    speak_threshold = 2
    speak_cooldown_seconds = 5.0

    def evaluate(
        self,
        exercise: str,
        keypoints: np.ndarray | None,
        session: LiveCoachSession,
        now: float | None = None,
    ) -> dict:
        now = now or time.time()
        if exercise not in EXERCISES:
            raise ValueError(f"Unknown exercise: {exercise}")

        if not _valid_keypoints(keypoints):
            session.phase = "ready"
            return {
                "phase": session.phase,
                "rep_count": session.rep_count,
                "status_color": "warn",
                "primary_cue": CUE_LIBRARY["no_person"],
                "secondary_cue": "",
                "speak_text": "",
                "errors": [
                    {
                        "code": "no_person",
                        "cue": CUE_LIBRARY["no_person"],
                        "severity": 1.0,
                    }
                ],
                "recent_cues": list(session.recent_cues),
            }

        phase, metric = self._phase_for(exercise, keypoints, session)
        errors = self._errors_for(exercise, keypoints, phase)
        self._update_rep_count(session, phase)
        speak_text = self._resolve_speech(errors, session, now)
        status_color = _status_from_errors(errors)
        primary_cue = errors[0]["cue"] if errors else "Nice rep | 动作稳定"
        secondary_cue = errors[1]["cue"] if len(errors) > 1 else ""

        session.phase = phase
        session.last_metric = metric

        return {
            "phase": phase,
            "rep_count": session.rep_count,
            "status_color": status_color,
            "primary_cue": primary_cue,
            "secondary_cue": secondary_cue,
            "speak_text": speak_text,
            "errors": errors,
            "recent_cues": list(session.recent_cues),
        }

    def build_summary(
        self,
        session: LiveCoachSession,
        finished_at: float | None = None,
    ) -> dict:
        finished_at = finished_at or time.time()
        ordered_errors = session.error_totals.most_common(3)
        top_mistakes = [
            {
                "code": code,
                "label": CUE_LIBRARY.get(code, code),
                "count": count,
            }
            for code, count in ordered_errors
        ]

        summary = {
            "session_id": session.session_id,
            "exercise": session.exercise,
            "exercise_label": EXERCISES[session.exercise]["label"],
            "rep_count": session.rep_count,
            "duration_seconds": round(max(0.0, finished_at - session.started_at), 1),
            "top_mistakes": top_mistakes,
            "encouragement": "Stable set | 这组完成得不错，继续保持。",
            "next_focus": top_mistakes[0]["label"] if top_mistakes else "Keep the same rhythm | 继续保持节奏。",
        }
        return summary

    def _phase_for(
        self,
        exercise: str,
        keypoints: np.ndarray,
        session: LiveCoachSession,
    ) -> tuple[str, float]:
        if exercise == "press":
            metric = _press_height_metric(keypoints)
            lockout_angle = _average(
                _joint_angle(keypoints[5], keypoints[7], keypoints[9]),
                _joint_angle(keypoints[6], keypoints[8], keypoints[10]),
            )
            if metric < 18.0:
                return "ready", metric
            if metric > 95.0 and lockout_angle > 160.0:
                return "ready", metric
            if session.last_metric is None or metric >= session.last_metric:
                return "rising", metric
            return "lowering", metric

        if exercise == "pushup":
            metric = 180.0 - _average(
                _joint_angle(keypoints[5], keypoints[7], keypoints[9]),
                _joint_angle(keypoints[6], keypoints[8], keypoints[10]),
            )
            if metric > 85.0:
                return "bottom", metric
            if metric < 20.0:
                return "ready", metric
            if session.last_metric is None or metric >= session.last_metric:
                return "lowering", metric
            return "rising", metric

        knee_angle = _primary_knee_angle(exercise, keypoints)
        metric = 180.0 - knee_angle
        bottom_threshold = 35.0 if exercise == "lunge" else 60.0

        if metric > bottom_threshold:
            return "bottom", metric
        if metric < 18.0:
            return "ready", metric
        if session.last_metric is None or metric >= session.last_metric:
            return "lowering", metric
        return "rising", metric

    def _errors_for(self, exercise: str, keypoints: np.ndarray, phase: str) -> list[dict]:
        if exercise == "squat":
            return self._squat_errors(keypoints, phase)
        if exercise == "lunge":
            return self._lunge_errors(keypoints)
        if exercise == "pushup":
            return self._pushup_errors(keypoints, phase)
        if exercise == "press":
            return self._press_errors(keypoints)
        return []

    def _squat_errors(self, keypoints: np.ndarray, phase: str) -> list[dict]:
        errors = []
        ankle_span = _span_x(keypoints[15], keypoints[16])
        knee_span = _span_x(keypoints[13], keypoints[14])
        trunk_tilt = _vertical_tilt(_midpoint(keypoints[5], keypoints[6]), _midpoint(keypoints[11], keypoints[12]))
        knee_angle = _primary_knee_angle("squat", keypoints)

        if ankle_span > 1e-6 and knee_span / ankle_span < 0.72:
            errors.append(_error("squat_knees_out", 0.95))
        if phase in ("lowering", "bottom") and knee_angle > 120.0:
            errors.append(_error("squat_depth", 0.75))
        if trunk_tilt > 22.0:
            errors.append(_error("squat_chest_up", 0.7))
        return _sorted_errors(errors)

    def _lunge_errors(self, keypoints: np.ndarray) -> list[dict]:
        errors = []
        ankle_distance = _distance(keypoints[15], keypoints[16])
        hip_width = max(_span_x(keypoints[11], keypoints[12]), 1.0)
        front_knee_index = 13 if _joint_angle(keypoints[11], keypoints[13], keypoints[15]) < _joint_angle(keypoints[12], keypoints[14], keypoints[16]) else 14
        front_ankle_index = 15 if front_knee_index == 13 else 16
        front_knee_offset = abs(keypoints[front_knee_index][0] - keypoints[front_ankle_index][0]) / hip_width
        trunk_tilt = _vertical_tilt(_midpoint(keypoints[5], keypoints[6]), _midpoint(keypoints[11], keypoints[12]))

        if ankle_distance / hip_width < 1.7:
            errors.append(_error("lunge_stride", 0.9))
        if trunk_tilt > 20.0:
            errors.append(_error("lunge_torso", 0.7))
        if front_knee_offset > 0.45:
            errors.append(_error("lunge_stack", 0.68))
        return _sorted_errors(errors)

    def _pushup_errors(self, keypoints: np.ndarray, phase: str) -> list[dict]:
        errors = []
        body_line = _average(
            _joint_angle(keypoints[5], keypoints[11], keypoints[15]),
            _joint_angle(keypoints[6], keypoints[12], keypoints[16]),
        )
        shoulder_span = max(_span_x(keypoints[5], keypoints[6]), 1.0)
        elbow_span = _span_x(keypoints[7], keypoints[8])
        elbow_angle = _average(
            _joint_angle(keypoints[5], keypoints[7], keypoints[9]),
            _joint_angle(keypoints[6], keypoints[8], keypoints[10]),
        )

        if body_line < 160.0:
            errors.append(_error("pushup_line", 0.92))
        if elbow_span / shoulder_span > 1.4:
            errors.append(_error("pushup_elbows", 0.78))
        if phase in ("lowering", "bottom") and elbow_angle > 110.0:
            errors.append(_error("pushup_depth", 0.7))
        return _sorted_errors(errors)

    def _press_errors(self, keypoints: np.ndarray) -> list[dict]:
        errors = []
        elbow_angle = _average(
            _joint_angle(keypoints[5], keypoints[7], keypoints[9]),
            _joint_angle(keypoints[6], keypoints[8], keypoints[10]),
        )
        trunk_tilt = _vertical_tilt(_midpoint(keypoints[5], keypoints[6]), _midpoint(keypoints[11], keypoints[12]))
        mid_wrist_x = _midpoint(keypoints[9], keypoints[10])[0]
        mid_ankle_x = _midpoint(keypoints[15], keypoints[16])[0]
        hip_width = max(_span_x(keypoints[11], keypoints[12]), 1.0)
        press_offset = abs(mid_wrist_x - mid_ankle_x) / hip_width
        height_metric = _press_height_metric(keypoints)

        if height_metric > 35.0 and (elbow_angle < 160.0 or height_metric < 85.0):
            errors.append(_error("press_lockout", 0.9))
        if trunk_tilt > 18.0:
            errors.append(_error("press_ribs", 0.82))
        if press_offset > 0.32:
            errors.append(_error("press_path", 0.7))
        return _sorted_errors(errors)

    def _update_rep_count(self, session: LiveCoachSession, phase: str) -> None:
        if phase == "bottom":
            session.seen_bottom = True
            return

        if phase == "ready" and session.seen_bottom:
            session.rep_count += 1
            session.seen_bottom = False

    def _resolve_speech(
        self,
        errors: list[dict],
        session: LiveCoachSession,
        now: float,
    ) -> str:
        seen_codes = {error["code"] for error in errors}
        for code in list(session.error_streaks):
            if code not in seen_codes:
                session.error_streaks[code] = 0

        for error in errors:
            code = error["code"]
            session.error_streaks[code] = session.error_streaks.get(code, 0) + 1
            session.error_totals[code] += 1

        if not errors:
            return ""

        primary = errors[0]
        code = primary["code"]
        streak = session.error_streaks.get(code, 0)
        last_spoken_at = session.last_spoken_at.get(code, float("-inf"))
        if streak < self.speak_threshold:
            return ""
        if now - last_spoken_at < self.speak_cooldown_seconds:
            return ""

        session.last_spoken_at[code] = now
        session.recent_cues.append(primary["cue"])
        session.recent_cues = session.recent_cues[-5:]
        return primary["cue"]


def _error(code: str, severity: float) -> dict:
    return {
        "code": code,
        "cue": CUE_LIBRARY[code],
        "severity": severity,
    }


def _sorted_errors(errors: list[dict]) -> list[dict]:
    return sorted(errors, key=lambda item: item["severity"], reverse=True)


def _status_from_errors(errors: list[dict]) -> str:
    if not errors:
        return "good"
    if errors[0]["severity"] >= 0.85:
        return "alert"
    return "warn"


def _valid_keypoints(keypoints: np.ndarray | None) -> bool:
    return keypoints is not None and isinstance(keypoints, np.ndarray) and keypoints.shape == (17, 2) and np.any(keypoints)


def _average(*values: float) -> float:
    return sum(values) / len(values)


def _midpoint(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    return (a + b) / 2.0


def _distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _span_x(a: np.ndarray, b: np.ndarray) -> float:
    return float(abs(a[0] - b[0]))


def _joint_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    ba = a - b
    bc = c - b
    denom = np.linalg.norm(ba) * np.linalg.norm(bc)
    if denom <= 1e-6:
        return 180.0
    cosine = float(np.dot(ba, bc) / denom)
    cosine = max(-1.0, min(1.0, cosine))
    return math.degrees(math.acos(cosine))


def _vertical_tilt(top: np.ndarray, bottom: np.ndarray) -> float:
    dx = float(top[0] - bottom[0])
    dy = float(bottom[1] - top[1])
    if abs(dy) <= 1e-6:
        return 90.0
    return abs(math.degrees(math.atan2(dx, dy)))


def _primary_knee_angle(exercise: str, keypoints: np.ndarray) -> float:
    left = _joint_angle(keypoints[11], keypoints[13], keypoints[15])
    right = _joint_angle(keypoints[12], keypoints[14], keypoints[16])
    return min(left, right) if exercise == "lunge" else _average(left, right)


def _press_height_metric(keypoints: np.ndarray) -> float:
    shoulder_y = _midpoint(keypoints[5], keypoints[6])[1]
    wrist_y = _midpoint(keypoints[9], keypoints[10])[1]
    return float(shoulder_y - wrist_y)
