from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from voice_player import PriorityVoicePlayer
from motion_monitor import MotionMonitor
import random
import time
import pyttsx3
import threading
import sqlite3
from ble import BLE, CHAR_UUID_W, CHAR_UUID_I
import struct
from enum import Enum
import logging

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- global variables for ESPs ---
sensors = [
            # {"name": "coachP_wl", "char_uuid": CHAR_UUID_W},
            # {"name": "coachP_wr", "char_uuid": CHAR_UUID_W},
            {"name": "coachP_il", "char_uuid": CHAR_UUID_I},
            # {"name": "coachP_ir", "char_uuid": CHAR_UUID_I}
        ]

class EspRole(Enum):
    WEIGHT_L = 0
    WEIGHT_R = 0
    IMU_L = 0
    IMU_R = 1

ESPs = []

# --- 模擬 BLE 張力與 IMU 三軸資料 --- 
async def read_ble_data():
    force = round(random.uniform(8.0, 15.0), 2)
    # imu = random.random() > 0.5 
    # force_raw = await ESPs[EspRole.WEIGHT_L.value].getRaw()
    # force     = struct.unpack('f', force_raw)[0]
    imu_raw   = await ESPs[EspRole.IMU_L.value].getRaw()
    imu       = bool(imu_raw[0])
    return {"force": force, "imu": imu}

# speak function
def speak(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()



# 測量基準值
async def measure_baseline_force(websocket):
    # voice = PriorityVoicePlayer()
    for i in range(5, 0, -1):
        # voice.speak(str(i), priority=10)
        threading.Thread(target=speak(str(i)), daemon=True).start()
        await websocket.send_json({"say": f"倒數計時: {i}"})
        print(f"倒數計時: {i}")
        await asyncio.sleep(1)
    # voice.speak("開始測量", priority=10)
    print("開始測量")
    threading.Thread(target=speak("開始測量"), daemon=True).start()
    await websocket.send_json({"say": "開始測量"})

    duration = 5
    interval = 0.1
    num_ticks = int(duration / interval)
    force_log = []

    for _ in range(num_ticks):
        reading = await read_ble_data()
        force = reading["force"]
        force_log.append(force)
        # await websocket.send_json({"force": force})
        await asyncio.sleep(interval)

    # voice.speak("基準值測量完畢", priority=10)
    await websocket.send_json({"say": "基準值測量完畢"})
    print("基準值測量完畢")
    threading.Thread(target=speak("基準值測量完畢"), daemon=True).start()
    top_five = sorted(force_log, reverse=True)[:5]
    baseline = sum(top_five) / len(top_five)
    print("sendback: ",{
        "action": "baseline_done",
        "baseline": round(baseline, 2)
    })
    await websocket.send_json({
        "action": "baseline_done",
        "baseline": round(baseline, 2)
    })

# 執行訓練流程
async def handle_training_session(websocket, voice: PriorityVoicePlayer,
                                   pull_time, hold_time, relax_time,
                                   target_reps, baseline):
    # motion_monitor = MotionMonitor(voice, imu_threshold=1.0)

    for i in range(5, 0, -1):
        threading.Thread(target=speak(str(i)), daemon=True).start()
        # voice.speak(str(i), priority=10)
        await websocket.send_json({"say": f"倒數計時: {i}"})
        print(f"倒數計時: {i}")
        await asyncio.sleep(1)
    # voice.speak("開始訓練", priority=10)
    await websocket.send_json({"say": "開始訓練"})
    print("開始訓練")
    # threading.Thread(target=speak("開始訓練"), daemon=True).start()
    rep = 0
    while rep < target_reps:
        threading.Thread(target=speak(f"拉起 {pull_time} 秒"), daemon=True).start()
        # await websocket.send_json({"rep": rep})
        total_time = pull_time + hold_time + relax_time
        tick_interval = 0.1
        ticks = int(total_time / tick_interval)
        

        # voice.speak(f"開始動作，拉起 {pull_time} 秒", priority=10)
        await websocket.send_json({
            "say": f"開始動作，拉起 {pull_time} 秒"
        })
        print(f"拉起 {pull_time} 秒")

        imu_set = False

        t = 0
        count = 0
        for i in range(ticks):
            now = time.time()
            # t = now - rep_start
            reading = await read_ble_data()
            force = reading["force"]
            imu = reading["imu"]

            phase = ""
            force_valid = 0

            if t <= pull_time:
                phase = "pull"
                target_force = baseline * (t / pull_time)
                if force >= target_force * 0.95:
                    force_valid = 1
                else:
                    # voice.speak("請加速拉起", priority=8)
                    websocket.send_json({
                        "say": "請加速拉起"
                    })
                    print("請加速拉起")
                    if count % 10 == 3:
                        threading.Thread(target=speak("快"), daemon=True).start()

            elif t <= pull_time + hold_time:
                phase = "hold"
                target_force = baseline
                if i == int(pull_time / tick_interval) + 1:
                    # voice.speak(f"請保持", priority=5)
                    await websocket.send_json({
                        "say": f"請保持動作 {hold_time} 秒"
                    })
                    print(f"請保持動作 {hold_time} 秒")
                    threading.Thread(target=speak(f"保持 {hold_time} 秒"), daemon=True).start()
                if baseline * 0.95 <= force <= baseline * 1.05:
                    force_valid = 1
                elif force < baseline * 0.95:
                    # voice.speak("還沒休息繼續用力", priority=8)
                    await websocket.send_json({
                        "say": "還沒休息繼續用力"
                    })
                    print("還沒休息繼續用力")
                    if count % 10 == 3:
                        threading.Thread(target=speak("用力",), daemon=True).start()
                elif force > baseline * 1.05:
                    # voice.speak("請不要再用力了", priority=8)
                    await websocket.send_json({
                        "say": "請不要再用力了"
                    })
                    print("請不要再用力了")
                    if count % 10 == 3:
                        threading.Thread(target=speak("鬆"), daemon=True).start()
            elif t <= total_time:
                phase = "relax"
                if i == int((pull_time + hold_time) / tick_interval) + 1:
                    # voice.speak(f"開始放鬆 {relax_time} 秒", priority=5)
                    await websocket.send_json({
                        "say": f"開始放鬆 {relax_time} 秒"
                    })
                    print(f"放鬆 {relax_time} 秒")
                    threading.Thread(target=speak(f"放鬆 {relax_time} 秒"), daemon=True).start()
                relax_t = t - (pull_time + hold_time)
                target_force = baseline * (1 - 0.95 * (relax_t / relax_time))
                if target_force * 0.9 <= force <= target_force * 1.1:
                    force_valid = 1
                elif force < target_force * 0.9:
                    # voice.speak("太快了不要偷懶", priority=8)
                    await websocket.send_json({
                        "say": "太快了不要偷懶"
                    })
                    print("太快了不要偷懶")
                    if count % 10 == 3:
                        threading.Thread(target=speak("慢"), daemon=True).start()
                elif force > target_force * 1.1:
                    # voice.speak("可以放快一點", priority=8)
                    await websocket.send_json({
                        "say": "可以放快一點"
                    })
                    print("可以放快一點")
                    if count % 10 == 3:
                        threading.Thread(target=speak("快"), daemon=True).start()
                    # threading.Thread(target=speak("快"), daemon=True).start()
            await websocket.send_json({
                "force": round(force, 2),
                "imu": imu,
                "force_valid": force_valid,
                "phase": phase,
                "reps": rep,
                "ideal_force": target_force,
                "time": t,
            })
            if imu:
                imu_set = True
            if imu_set and count % 10 == 8:
                # voice.speak("請不要動膝蓋", priority=6)
                await websocket.send_json({
                    "say": "請不要動膝蓋"
                })
                print("請不要動膝蓋")
                imu_set = False
                threading.Thread(target=speak("別動"), daemon=True).start()
            print(f"Phase: {phase}, Force: {force}, IMU: {imu}, Valid: {force_valid}")

            await asyncio.sleep(tick_interval)
            t += tick_interval
            count += 1
        rep += 1
        # voice.speak(f"完成第 {rep} 次", priority=10)
        print(f"完成第 {rep} 次")
        # threading.Thread(target=speak(f"完成第 {rep} 次"), daemon=True).start()
    # voice.speak("本組訓練結束，請休息", priority=3)
    await websocket.send_json({
        "say": "本組訓練結束，請休息"
    })
    print("本組訓練結束，請休息")
    threading.Thread(target=speak("本組訓練結束，請休息"), daemon=True).start()
    await websocket.send_json({"status": "done", "total_reps": rep})
    print("Training session completed")

@app.get("/")
def read_root():
    return {"msg": "FastAPI is working!"}


# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("WebSocket connection established")

    await websocket.accept()

    print("WebSocket accepted")

    # --- ble setup --- 
    logging.basicConfig(
        level=logging.WARNING,
        format="%(asctime)-15s %(name)-8s %(levelname)s: %(message)s",
    )
    lock = asyncio.Lock()
    global sensors
    global ESPs
    ESPs = [BLE(esp["name"], esp["char_uuid"]) for esp in sensors]

    connect_tasks = [asyncio.create_task(esp.connect(lock)) for esp in ESPs]

    # Wait for all devices to report they're connected
    while not all(esp.connected for esp in ESPs):
        await asyncio.sleep(0.1)

    print("ESPs connected")
    # now sensors are connected.
    # check connection status with ESPs(index).connected


    voice = PriorityVoicePlayer(rate=230)
    # voice.set_websocket(websocket)

    # --- 遊戲模式控制狀態 ---
    game_mode_running = False

    # 建立排行榜資料表
    db_conn = sqlite3.connect("leaderboard.db", check_same_thread=False)
    db_cursor = db_conn.cursor()
    db_cursor.execute("""
    CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        score INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    db_conn.commit()

    def load_leaderboard_from_db():
        db_cursor.execute("SELECT score FROM leaderboard ORDER BY score DESC LIMIT 3")
        return [row[0] for row in db_cursor.fetchall()]
    
    leaderboard = load_leaderboard_from_db()

    while True:
        data = await websocket.receive_json()
        print("Received data:", data)
        if data.get("action") == "start_training":
            print("Start training session")
            params = data.get("config")
            await handle_training_session(
                websocket,
                voice,
                pull_time=params["pull"],
                hold_time=params["hold"],
                relax_time=params["relax"],
                target_reps=params["reps"],
                baseline=params["baseline"]
            )
        elif data.get("action") == "measure_baseline":
            print("Start measuring baseline")
            await measure_baseline_force(websocket)

        elif data.get("action") == "start_game_mode":
            print("啟動遊戲模式")
            game_mode_running = True

            async def stream_game_data():
                while game_mode_running:
                    reading = await read_ble_data()
                    await websocket.send_json({"force": reading["force"]})
                    await asyncio.sleep(0.1)

            asyncio.create_task(stream_game_data())

        elif data.get("action") == "stop_game_mode":
            print("結束遊戲模式")
            game_mode_running = False

        elif data.get("action") == "submit_score":
            score = data.get("score", 0)
            print(f"接收遊戲分數：{score}")
            db_cursor.execute("INSERT INTO leaderboard (score) VALUES (?)", (score,))
            db_conn.commit()

            leaderboard[:] = load_leaderboard_from_db()
            # await websocket.send_json({"status": "score_saved"})

        elif data.get("action") == "get_leaderboard":
            # db_cursor.execute("SELECT score FROM leaderboard ORDER BY score DESC LIMIT 3")
            leaderboard = load_leaderboard_from_db()
            await websocket.send_json({"action": "leaderboard", "top_scores": leaderboard})

