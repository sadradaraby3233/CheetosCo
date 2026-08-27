import pygame
import math
import array
import random

class Audio:
    def __init__(self):
        pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
        self.sounds = {}
        self._generate_sounds()

    def _make_tone_mono(self, freq, duration, volume=0.3, wave='sine'):
        sr = 44100
        n = int(sr * duration)
        buf = array.array('h')
        for i in range(n):
            t = i / sr
            env = max(0.0, 1.0 - (i / n))
            if wave == 'sine':
                v = math.sin(2 * math.pi * freq * t)
            elif wave == 'square':
                v = 1.0 if math.sin(2 * math.pi * freq * t) > 0 else -1.0
            elif wave == 'sawtooth':
                v = 2.0 * (freq * t - math.floor(0.5 + freq * t))
            elif wave == 'triangle':
                v = 2.0 * abs(2.0 * (freq * t - math.floor(0.5 + freq * t))) - 1.0
            else:
                v = math.sin(2 * math.pi * freq * t)
            buf.append(int(32767 * volume * env * v))
        return buf

    def _make_noise_mono(self, duration, volume=0.1):
        sr = 44100
        n = int(sr * duration)
        buf = array.array('h')
        for i in range(n):
            env = max(0.0, 1.0 - (i / n)) ** 2
            buf.append(int(32767 * volume * env * (random.random() * 2 - 1)))
        return buf

    def _make_sweep_mono(self, freq_start, freq_end, duration, volume=0.3):
        sr = 44100
        n = int(sr * duration)
        buf = array.array('h')
        phase = 0.0
        for i in range(n):
            t = i / sr
            progress = i / n
            freq = freq_start + (freq_end - freq_start) * progress
            env = max(0.0, 1.0 - progress)
            phase += 2 * math.pi * freq / sr
            v = math.sin(phase)
            buf.append(int(32767 * volume * env * v))
        return buf

    def _combine(self, *bufs):
        max_len = max(len(b) for b in bufs)
        out = array.array('h')
        for i in range(max_len):
            total = 0
            for b in bufs:
                if i < len(b):
                    total += b[i]
            total = max(-32767, min(32767, total))
            out.append(total)
        return out

    def _pan_stereo(self, mono_buf, pan=0.0):
        """Constant-power panning. pan: -1=left, 0=center, 1=right."""
        angle = (pan + 1.0) * math.pi / 4.0
        lg = math.cos(angle)
        rg = math.sin(angle)
        stereo = array.array('h')
        for s in mono_buf:
            stereo.append(int(s * lg))
            stereo.append(int(s * rg))
        return stereo

    def _add_itd(self, stereo_buf, pan):
        """Interaural time delay for spatial realism."""
        if abs(pan) < 0.1:
            return stereo_buf
        sr = 44100
        delay = int(sr * 0.00065 * abs(pan))
        if delay == 0:
            return stereo_buf
        length = len(stereo_buf) // 2
        result = array.array('h')
        for i in range(length):
            if pan > 0:
                li = max(0, i - delay) * 2
                result.append(stereo_buf[li])
                result.append(stereo_buf[i * 2 + 1])
            else:
                ri = max(0, i - delay) * 2 + 1
                result.append(stereo_buf[i * 2])
                result.append(stereo_buf[ri])
        return result

    def _to_sound(self, stereo_buf):
        return pygame.mixer.Sound(buffer=stereo_buf.tobytes())

    def _generate_sounds(self):
        # Step: filtered noise burst
        noise = self._make_noise_mono(0.12, 0.35)
        self.sounds['step'] = self._to_sound(self._pan_stereo(noise, 0.0))

        # Beacon: descending sweep 1200->800
        self.sounds['beacon_mono'] = self._make_sweep_mono(1200, 800, 0.12, 0.3)

        # Radar lock-on: ascending chirp 800->1600, short
        self.sounds['lockon_mono'] = self._make_sweep_mono(800, 1600, 0.08, 0.35)

        # Menu move
        self.sounds['menu_move'] = self._to_sound(self._pan_stereo(self._make_tone_mono(600, 0.08, 0.2), 0.0))

        # Menu select: two tones
        t1 = self._make_tone_mono(800, 0.06, 0.25)
        t2 = self._make_tone_mono(1200, 0.1, 0.2)
        # Offset t2 by padding
        padded_t2 = array.array('h', [0] * int(44100 * 0.06))
        padded_t2.extend(t2)
        self.sounds['menu_select'] = self._to_sound(self._pan_stereo(self._combine(t1, padded_t2), 0.0))

        # Menu back
        b1 = self._make_tone_mono(500, 0.08, 0.2)
        b2 = self._make_tone_mono(350, 0.12, 0.15)
        padded_b2 = array.array('h', [0] * int(44100 * 0.06))
        padded_b2.extend(b2)
        self.sounds['menu_back'] = self._to_sound(self._pan_stereo(self._combine(b1, padded_b2), 0.0))

        # Menu open: ascending
        o1 = self._make_tone_mono(400, 0.1, 0.2)
        o2 = self._make_tone_mono(600, 0.1, 0.2)
        o3 = self._make_tone_mono(800, 0.15, 0.2)
        pad2 = array.array('h', [0] * int(44100 * 0.08))
        pad2.extend(o2)
        pad3 = array.array('h', [0] * int(44100 * 0.16))
        pad3.extend(o3)
        self.sounds['menu_open'] = self._to_sound(self._pan_stereo(self._combine(o1, pad2, pad3), 0.0))

        # Collision: low thud + noise
        thud = self._make_tone_mono(120, 0.08, 0.25, 'sawtooth')
        cn = self._make_noise_mono(0.05, 0.15)
        self.sounds['collision'] = self._to_sound(self._pan_stereo(self._combine(thud, cn), 0.0))

        # Error
        self.sounds['error'] = self._to_sound(self._pan_stereo(self._make_tone_mono(150, 0.15, 0.2, 'square'), 0.0))

    def play(self, name):
        if name in self.sounds:
            self.sounds[name].play()

    def play_panned(self, name, pan=0.0):
        """Play a mono sound with stereo panning + ITD."""
        mono_key = name
        if mono_key not in self.sounds:
            return
        mono_buf = self.sounds[mono_key]
        stereo = self._pan_stereo(mono_buf, pan)
        stereo = self._add_itd(stereo, pan)
        snd = pygame.mixer.Sound(buffer=stereo.tobytes())
        snd.play()
