import os
import time
import hashlib
import subprocess
import shutil
import cv2  # 新增：用于处理图像可视化
import torch
import numpy as np
import imageio_ffmpeg
from flask import Flask, request, render_template, jsonify, send_from_directory, abort
from werkzeug.utils import secure_filename

# 引入自定义模块
from src.rtmpose_tran import RTM_Pose_Tran
from src.datapro import PreProcess
from src.score import Score
from src.model import ST_GCN
from src.local_llm import chat_with_ollama_model

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'static/results'  # 新增：保存可视化图像的目录
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)  # 确保目录存在

RUNTIME_DIR = os.getenv("POSE_RUNTIME_DIR", r"D:\PoseClassifierRuntime")
FFMPEG_DIR = os.path.join(RUNTIME_DIR, "ffmpeg")
app.config['COMPAT_VIDEO_FOLDER'] = os.path.join(RUNTIME_DIR, "compat_videos")
os.makedirs(FFMPEG_DIR, exist_ok=True)
os.makedirs(app.config['COMPAT_VIDEO_FOLDER'], exist_ok=True)

VIDEO_DIR_CANDIDATES = [
    os.getenv("POSE_VIDEO_DIR"),
    r"E:\Program\PoseClassifier\配套视频",
    r"D:\桌面\配套视频",
    r"E:\配套视频",
]
VIDEO_DIR = next(
    (path for path in VIDEO_DIR_CANDIDATES if path and os.path.isdir(path)),
    VIDEO_DIR_CANDIDATES[1],
)
if not os.path.isdir(VIDEO_DIR):
    print(
        f"演示视频目录不存在: {VIDEO_DIR}。"
        "请设置环境变量 POSE_VIDEO_DIR，或把 VIDEO_DIR 改成你自己的路径。"
    )

ACTION_CLASSES = {
    0: "双手托天理三焦", 1: "左右开弓似射雕", 2: "调理脾胃须单举",
    3: "五劳七伤往后瞧", 4: "摇头摆尾去心火", 5: "双手攀足固肾腰",
    6: "攒拳怒目增气力", 7: "背后七颠百病消", 8: "虎戏", 9: "鹿戏",
    10: "熊戏", 11: "猿戏", 12: "鸟戏", 13: "收势", 14: "无法识别/其他"
}

session_histories = {}
model, device = None, None


def _detect_video_codec_tag(video_path):
    cap = cv2.VideoCapture(video_path)
    try:
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
    finally:
        cap.release()
    return "".join(chr((fourcc >> (8 * i)) & 0xFF) for i in range(4)).strip().lower()


def _compat_video_path(filename):
    digest = hashlib.sha1(filename.encode("utf-8")).hexdigest()[:16]
    return os.path.join(app.config['COMPAT_VIDEO_FOLDER'], f"{digest}.mp4")


def _get_ffmpeg_exe():
    bundled_exe = imageio_ffmpeg.get_ffmpeg_exe()
    runtime_exe = os.path.join(FFMPEG_DIR, os.path.basename(bundled_exe))
    if not os.path.exists(runtime_exe):
        shutil.copy2(bundled_exe, runtime_exe)
        print(f"已将 ffmpeg 复制到: {runtime_exe}")
    return runtime_exe


def _ensure_browser_compatible_video(filename):
    source_path = os.path.join(VIDEO_DIR, filename)
    if not os.path.isfile(source_path):
        abort(404, description=f"演示视频不存在: {source_path}")

    codec_tag = _detect_video_codec_tag(source_path)
    if codec_tag != "hevc":
        return source_path

    compat_path = _compat_video_path(filename)
    if os.path.exists(compat_path) and os.path.getmtime(compat_path) >= os.path.getmtime(source_path):
        return compat_path

    ffmpeg_exe = _get_ffmpeg_exe()
    tmp_path = compat_path + ".tmp.mp4"
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        source_path,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-f",
        "mp4",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        tmp_path,
    ]
    print(f"检测到 HEVC 视频，开始转码供浏览器播放: {filename}")
    result = subprocess.run(cmd, capture_output=True)
    stderr_text = result.stderr.decode("utf-8", errors="replace") if result.stderr else ""
    if result.returncode != 0:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise RuntimeError(
            "视频转码失败: " + "\n".join(stderr_text.splitlines()[-8:])
        )
    os.replace(tmp_path, compat_path)
    print(f"转码完成: {compat_path}")
    return compat_path


def load_global_model():
    global model, device
    if model is None:
        model_path = r"model/best_model_7_exchange_val_and_test.pth"
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"使用 {device} 加载模型")

        # 当前仓库里的这份权重实际是 15 分类。
        model = ST_GCN(num_classes=15, in_channels=2, t_kernel_size=9, hop_size=1)
        print(f"准备加载模型权重: {model_path}")
        model.load_state_dict(torch.load(model_path, map_location=device))
        print("加载模型权重成功")
        model.to(device)
        model.eval()


load_global_model()


# --- 辅助逻辑函数 ---

def estimate_heart_rate(keypoints):
    if keypoints is None or len(keypoints) < 2: return None
    total_movement = 0
    num_points = keypoints.shape[1]
    for i in range(1, len(keypoints)):
        frame_diff = np.abs(keypoints[i] - keypoints[i - 1])
        total_movement += np.sum(frame_diff)
    avg_movement = total_movement / (len(keypoints) * num_points)
    base_hr = 70
    movement_factor = min(avg_movement * 500, 50)
    return max(60, int(min(base_hr + movement_factor, 180)))


def extract_section(text, start_marker, end_marker=None):
    try:
        start = text.find(start_marker)
        if start == -1: return ""
        start += len(start_marker)
        end = text.find(end_marker, start) if end_marker else len(text)
        if end == -1: end = len(text)
        return text[start:end].strip().replace("*", "")
    except:
        return ""


def generate_feedback(action_id, score, heart_rate=None):
    import re

    hr_info = f"心率: {heart_rate} BPM" if heart_rate else "心率: 未检测"
    prompt = f"""你是一位专业的健身教练和中医养生专家，请用中文回答。
动作名称: {ACTION_CLASSES.get(action_id, '未知')}
动作评分: {score:.2f} (满分1.00)
{hr_info}

请严格按下面格式输出，每个标签单独一行，标签后直接跟内容，不要有多余说明：
[动作评价] 对该动作完成情况的整体评价
[评分分析] 对评分高低的具体分析
[心率评估] 对当前心率的评估
[改进建议] 具体的改进建议
[鼓励话语] 一句鼓励的话"""
    try:
        response = chat_with_ollama_model([{'role': 'user', 'content': prompt}])
        full_text = response['message']['content']
        print(f"[DEBUG] ollama raw: {full_text[:200]}")

        clean_text = re.sub(r'<think>[\s\S]*?</think>', '', full_text).strip()

        def extract(text, tag):
            pattern = rf'\[{re.escape(tag)}\]\s*(.*?)(?=\[[\u4e00-\u9fa5a-zA-Z]+\]|$)'
            m = re.search(pattern, text, re.DOTALL)
            return m.group(1).strip().replace('*', '') if m else ''

        return {
            'raw': clean_text,
            'evaluation': extract(clean_text, '动作评价'),
            'analysis': extract(clean_text, '评分分析'),
            'hr_eval': extract(clean_text, '心率评估'),
            'suggestion': extract(clean_text, '改进建议'),
            'encouragement': extract(clean_text, '鼓励话语'),
        }
    except Exception as e:
        print(f"[ERROR] generate_feedback failed: {e}")
        return {
            'raw': str(e),
            'evaluation': f"Gemma 反馈未就绪: {e}",
            'analysis': '',
            'hr_eval': '',
            'suggestion': '',
            'encouragement': '',
        }


def create_visualization(video_path, keypoints, filename):
    """新增：截取中间帧并画出骨骼连线，用于前端显示"""
    try:
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) // 2)
        ret, frame = cap.read()
        cap.release()

        if ret and keypoints is not None:
            # 取中间帧的骨骼点
            kp_frame = keypoints[len(keypoints) // 2]
            # 简单的连线逻辑 (基于COCO 17点)
            skeleton = [(5, 7), (7, 9), (6, 8), (8, 10), (11, 13), (13, 15), (12, 14), (14, 16), (5, 6), (11, 12),
                        (5, 11), (6, 12)]
            for p1, p2 in skeleton:
                pt1 = (int(kp_frame[p1][0]), int(kp_frame[p1][1]))
                pt2 = (int(kp_frame[p2][0]), int(kp_frame[p2][1]))
                cv2.line(frame, pt1, pt2, (0, 255, 0), 2)
                cv2.circle(frame, pt1, 4, (0, 0, 255), -1)
                cv2.circle(frame, pt2, 4, (0, 0, 255), -1)

            out_filename = f"vis_{int(time.time())}.jpg"
            out_path = os.path.join(app.config['RESULT_FOLDER'], out_filename)
            cv2.imwrite(out_path, frame)
            return f"/{app.config['RESULT_FOLDER']}/{out_filename}"
    except Exception as e:
        print(f"Visualization error: {e}")
    return ""


# --- 路由 ---

@app.route('/local_videos/<path:filename>')
def serve_video(filename):
    if not os.path.isdir(VIDEO_DIR):
        abort(404, description=f"演示视频目录不存在: {VIDEO_DIR}")
    playable_path = _ensure_browser_compatible_video(filename)
    return send_from_directory(
        os.path.dirname(playable_path),
        os.path.basename(playable_path),
    )

@app.route('/')
def index():
    return render_template('index.html', result=None)


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'video' not in request.files: return render_template('index.html', error="未选择文件")
    file = request.files['video']
    if file.filename == '': return render_template('index.html', error="文件名为空")

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        start_time = time.time()
        good_vid, keypoints = RTM_Pose_Tran(filepath, display_pose=False)

        if not good_vid: return render_template('index.html', error="无法提取骨骼关键点")

        pp_keypoints = PreProcess(keypoints)
        action, conf = model.predict(pp_keypoints)
        action_id = int(action[0][0])
        conf_val = float(conf[0][0])
        print(f"[DEBUG] action={action_id}, conf={conf_val:.4f}")
        score = Score(keypoints, action_id, conf_val)
        print(f"[DEBUG] score={score:.4f}")

        if action_id == 14 or (score < 0.3 and conf_val < 0.3):
            action_id = 14
            score = 0.0

        heart_rate = estimate_heart_rate(keypoints)
        duration = time.time() - start_time

        # 截取可视化图像
        vis_image_path = create_visualization(filepath, keypoints, filename)
        feedback_data = generate_feedback(action_id, score, heart_rate)

        result_data = {
            'filename': filename,
            'action_id': action_id,
            'action_name': ACTION_CLASSES[action_id],
            'score': score,
            'heart_rate': heart_rate,
            'duration': duration,
            'frame_count': keypoints.shape[0],
            'feedback': feedback_data,
            'vis_image': vis_image_path  # 传回前端渲染
        }

        try:
            os.remove(filepath)
        except:
            pass

        return render_template('index.html', result=result_data)

    except Exception as e:
        try:
            os.remove(filepath)
        except:
            pass
        return render_template('index.html', error=f"处理发生错误: {str(e)}")


@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_msg = data.get('message')
        action_id = int(data.get('action'))
        score = float(data.get('score'))

        session_id = request.remote_addr
        if session_id not in session_histories:
            bg_info = f"用户动作：{ACTION_CLASSES.get(action_id)}，评分：{score:.2f}。"
            session_histories[session_id] = [
                {'role': 'system', 'content': f'你是一个健身教练。{bg_info} 请回答用户问题。'}
            ]

        session_histories[session_id].append({'role': 'user', 'content': user_msg})
        response = chat_with_ollama_model(session_histories[session_id])
        reply = response['message']['content']
        session_histories[session_id].append({'role': 'assistant', 'content': reply})

        return jsonify({'reply': reply})
    except Exception as e:
        return jsonify({'reply': f'Gemma 调用失败: {e}'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
