# voice_player.py
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
                if priority < self.current_priority:
                    self.engine.stop()
                    self.voice_queue.put((priority, text))
                else:
                    pass  # discard
            else:
                self.voice_queue.put((priority, text))

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
