# motion_monitor.py

class MotionMonitor:
    def __init__(self, voice, imu_threshold=1.0, cooldown=2.0):
        """
        voice: 傳入 PriorityVoicePlayer 實例，用於播放語音提示
        imu_threshold: 超過此值表示偵測到異常晃動
        cooldown: 最短間隔秒數（避免語音重複播放太頻繁）
        """
        self.voice = voice
        self.imu_threshold = imu_threshold
        self.cooldown = cooldown
        self.last_alert_time = 0

    def check(self, imu_value, now_time):
        """
        imu_value: 當前 IMU 偵測的加速度變化量（可用 RMS 或總和變異）
        now_time: 現在時間戳（用於 cooldown 控制）

        回傳：
        True = 偵測到異常（例如膝蓋移動）
        False = 沒有問題
        """
        if imu_value > self.imu_threshold:
            if now_time - self.last_alert_time > self.cooldown:
                self.voice.speak("請不要動膝蓋", priority=6)
                self.last_alert_time = now_time
            return True
        return False
