import pygame
import math
import array

class Audio:
    def __init__(self):
        pygame.mixer.init(frequency=44100, size=-16, channels=1, buffer=512)
        self.sounds = {}
        self._generate_sounds()

    def _make_tone(self, freq, duration, volume=0.3):
        sample_rate = 44100
        n_samples = int(sample_rate * duration)
        buf = array.array('h')
        for i in range(n_samples):
            t = i / sample_rate
            envelope = max(0.0, 1.0 - (i / n_samples))
            value = int(32767 * volume * envelope * math.sin(2 * math.pi * freq * t))
            buf.append(value)
        return pygame.mixer.Sound(buffer=buf.tobytes())

    def _generate_sounds(self):
        self.sounds['step'] = self._make_tone(200, 0.1, 0.2)
        self.sounds['beacon'] = self._make_tone(1000, 0.1, 0.3)
        self.sounds['menu_move'] = self._make_tone(600, 0.08, 0.2)
        self.sounds['menu_select'] = self._make_tone(800, 0.06, 0.25)
        self.sounds['menu_back'] = self._make_tone(400, 0.08, 0.2)
        self.sounds['menu_open'] = self._make_tone(500, 0.1, 0.2)
        self.sounds['collision'] = self._make_tone(120, 0.08, 0.2)
        self.sounds['error'] = self._make_tone(150, 0.15, 0.2)

    def play(self, name):
        if name in self.sounds:
            self.sounds[name].play()
