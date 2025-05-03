from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from voice_player import PriorityVoicePlayer
from motion_monitor import MotionMonitor
import random
import time
from "./ble.py" import BLE

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- global variables for ESPs ---
sensors = [
            {"name": "coachP_wl", "char_uuid": CHAR_UUID_W},
            # {"name": "coachP_wr", "char_uuid": CHAR_UUID_W},
            {"name": "coachP_il", "char_uuid": CHAR_UUID_I},
            # {"name": "coachP_ir", "char_uuid": CHAR_UUID_I}
        ]

class EspRole(Enum):
    WEIGHT_L = 0
    WEIGHT_R = 0
    IMU_L = 1
    IMU_R = 1

ESPs = []

# --- 模擬 BLE 張力與 IMU 三軸資料 --- TODO: change to real BLE data
async def read_ble_data():
    # await asyncio.sleep(0.005)
    # force = round(random.uniform(8.0, 15.0), 2)
    # imu = round(random.uniform(0.2, 0.5) if random.random() > 0.1 else random.uniform(1.2, 1.5), 2)
    force = await ESPs[EspRole.WEIGHT_L].getRaw()
    imu =   await ESPs[EspRole.IMU_L].getRaw()
    return {"force": force, "imu": imu}


# --- 測量基準值 ---
async def measure_baseline_force(websocket, voice: PriorityVoicePlayer):
    for i in range(5, 0, -1):
        voice.speak(str(i), priority=10)
        await asyncio.sleep(1)
    voice.speak("開始測量", priority=10)

    duration = 5
    interval = 0.1
    num_ticks = int(duration / interval)
    force_log = []

    for _ in range(num_ticks):
        reading = await read_ble_data()
        force = reading["force"]
        force_log.append(force)
        await websocket.send_json({"force": force})
        await asyncio.sleep(interval)

    voice.speak("基準值測量完畢", priority=10)
    top_five = sorted(force_log, reverse=True)[:5]
    baseline = sum(top_five) / len(top_five)
    await websocket.send_json({
        "action": "baseline_done",
        "baseline": round(baseline, 2)
    })


# --- 執行訓練流程 ---
async def handle_training_session(websocket, voice: PriorityVoicePlayer,
                                   pull_time, hold_time, relax_time,
                                   target_reps, baseline):
    motion_monitor = MotionMonitor(voice, imu_threshold=1.0)

    for i in range(5, 0, -1):
        voice.speak(str(i), priority=10)
        await asyncio.sleep(1)
    voice.speak("開始訓練", priority=10)

    rep = 0
    while rep < target_reps:
        rep += 1
        await websocket.send_json({"rep": rep})
        total_time = pull_time + hold_time + relax_time
        tick_interval = 0.1
        ticks = int(total_time / tick_interval)
        rep_start = time.time()

        voice.speak(f"開始動作，拉起 {pull_time} 秒", priority=10)

        for i in range(ticks):
            now = time.time()
            t = now - rep_start
            reading = await read_ble_data()
            force = reading["force"]
            imu = reading["imu"]

            knee_motion = motion_monitor.check(imu, now)

            phase = ""
            force_valid = 0

            if t <= pull_time:
                phase = "pull"
                if force >= baseline * 0.95:
                    force_valid = 1
                else:
                    voice.speak("請加速拉起", priority=8)

            elif t <= pull_time + hold_time:
                phase = "hold"
                if i == int(pull_time / tick_interval) + 1:
                    voice.speak(f"請保持動作 {hold_time} 秒", priority=5)
                if baseline * 0.95 <= force <= baseline * 1.05:
                    force_valid = 1
                elif force < baseline * 0.95:
                    voice.speak("還沒休息繼續用力", priority=8)
                elif force > baseline * 1.05:
                    voice.speak("請不要再用力了", priority=8)

            elif t <= total_time:
                phase = "relax"
                if i == int((pull_time + hold_time) / tick_interval) + 1:
                    voice.speak(f"開始放鬆 {relax_time} 秒", priority=5)
                relax_t = t - (pull_time + hold_time)
                target_force = baseline * (1 - 0.95 * (relax_t / relax_time))
                if target_force * 0.9 <= force <= target_force * 1.1:
                    force_valid = 1
                elif force < target_force * 0.9:
                    voice.speak("太快了不要偷懶", priority=8)
                elif force > target_force * 1.1:
                    voice.speak("可以放快一點", priority=8)

            await websocket.send_json({
                "force": round(force, 2),
                "knee_motion": knee_motion,
                "force_valid": force_valid,
                "phase": phase
            })

            await asyncio.sleep(tick_interval)

        voice.speak(f"完成第 {rep} 次", priority=10)

    voice.speak("本組訓練結束，請休息", priority=3)
    await websocket.send_json({"status": "done", "total_reps": rep})




# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()


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

    # now sensors are connected.
    # check connection status with ESPs(index).connected


    voice = PriorityVoicePlayer(rate=230)

    while True:
        data = await websocket.receive_json()
        if data.get("action") == "start_training":
            params = data["params"]
            await handle_training_session(
                websocket,
                voice,
                pull_time=params["pull_time"],
                hold_time=params["hold_time"],
                relax_time=params["relax_time"],
                target_reps=params["target_reps"],
                baseline=params["baseline"]
            )
        elif data.get("action") == "measure_baseline":
            await measure_baseline_force(websocket, voice)
