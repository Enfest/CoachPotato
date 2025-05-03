# priority_voice_player.py

import pyttsx3
import threading
import time
from queue import PriorityQueue

class PriorityVoicePlayer:
    def __init__(self, rate=220):
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', rate)
        self.voice_queue = PriorityQueue()
        self.lock = threading.Lock()
        self.current_priority = None
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()

    def speak(self, text: str, priority: int = 10):
        with self.lock:
            if self.engine.isBusy():
                if self.current_priority is None or priority < self.current_priority:
                    self.engine.stop()  # 中止當前語音
                    self.voice_queue.put((priority, text))
                    self.current_priority = priority
                else:
                    return  # discard 較低或相同優先權語音
            else:
                self.voice_queue.put((priority, text))
                self.current_priority = priority

    def _worker(self):
        while True:
            priority, text = self.voice_queue.get()
            with self.lock:
                self.current_priority = priority
            self.engine.say(text)
            self.engine.runAndWait()
            with self.lock:
                self.current_priority = None
            time.sleep(0.05)

    def set_rate(self, rate: int):
        self.engine.setProperty('rate', rate)
