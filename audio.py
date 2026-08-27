import pygame
import math
import array
import random

class Audio:
    def __init__(self):
        pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
        self.sounds = {}
        self._generate_sounds()

    def _make_tone(self, freq, duration, volume=0.3, wave_type='sine'):
        """Generate a mono tone with envelope decay."""
        sample_rate = 44100
        n_samples = int(sample_rate * duration)
        buf = array.array('h')
        
        for i in range(n_samples):
            t = i / sample_rate
            envelope = max(0.0, 1.0 - (i / n_samples))
            
            if wave_type == 'sine':
                value = math.sin(2 * math.pi * freq * t)
            elif wave_type == 'square':
                value = 1.0 if math.sin(2 * math.pi * freq * t) > 0 else -1.0
            elif wave_type == 'sawtooth':
                value = 2.0 * (freq * t - math.floor(0.5 + freq * t))
            elif wave_type == 'triangle':
                value = 2.0 * abs(2.0 * (freq * t - math.floor(0.5 + freq * t))) - 1.0
            else:
                value = math.sin(2 * math.pi * freq * t)
            
            sample = int(32767 * volume * envelope * value)
            buf.append(sample)
        
        return buf

    def _make_noise(self, duration, volume=0.1):
        """Generate mono noise with envelope decay."""
        sample_rate = 44100
        n_samples = int(sample_rate * duration)
        buf = array.array('h')
        
        for i in range(n_samples):
            envelope = max(0.0, 1.0 - (i / n_samples))
            noise = (random.random() * 2 - 1)
            sample = int(32767 * volume * envelope * noise)
            buf.append(sample)
        
        return buf

    def _apply_bandpass(self, buf, center_freq, q=1.0):
        """Simple bandpass filter approximation."""
        # For now, return as-is - proper filtering would need more work
        return buf

    def _pan_stereo(self, mono_buf, pan=0.0):
        """Convert mono to stereo with panning. pan=-1 is left, 0 is center, 1 is right."""
        # Constant-power panning
        angle = (pan + 1.0) * math.pi / 4.0  # Map -1..1 to 0..pi/2
        left_gain = math.cos(angle)
        right_gain = math.sin(angle)
        
        stereo_buf = array.array('h')
        for sample in mono_buf:
            stereo_buf.append(int(sample * left_gain))
            stereo_buf.append(int(sample * right_gain))
        
        return stereo_buf

    def _add_itd(self, stereo_buf, pan=0.0, sample_rate=44100):
        """Add interaural time delay for more realistic spatial audio."""
        if abs(pan) < 0.1:
            return stereo_buf
        
        # Max ITD is about 0.65ms for human head
        max_delay_samples = int(sample_rate * 0.00065)
        delay_samples = int(max_delay_samples * abs(pan))
        
        if delay_samples == 0:
            return stereo_buf
        
        result = array.array('h')
        length = len(stereo_buf) // 2
        
        for i in range(length):
            left_idx = i * 2
            right_idx = i * 2 + 1
            
            if pan > 0:  # Sound is to the right, delay left channel
                delayed_left_idx = max(0, i - delay_samples) * 2
                result.append(stereo_buf[delayed_left_idx])
                result.append(stereo_buf[right_idx])
            else:  # Sound is to the left, delay right channel
                delayed_right_idx = max(0, i - delay_samples) * 2 + 1
                result.append(stereo_buf[left_idx])
                result.append(stereo_buf[delayed_right_idx])
        
        return result

    def _generate_sounds(self):
        """Generate all game sounds."""
        
        # Step sound: filtered noise
        noise_buf = self._make_noise(0.12, 0.4)
        self.sounds['step'] = pygame.mixer.Sound(buffer=self._pan_stereo(noise_buf, 0.0).tobytes())
        
        # Beacon: descending sweep 1200Hz -> 800Hz
        sample_rate = 44100
        duration = 0.12
        n_samples = int(sample_rate * duration)
        beacon_buf = array.array('h')
        for i in range(n_samples):
            t = i / sample_rate
            freq = 1200 - (400 * t / duration)  # Sweep down
            envelope = max(0.0, 1.0 - (i / n_samples))
            value = math.sin(2 * math.pi * freq * t)
            sample = int(32767 * 0.3 * envelope * value)
            beacon_buf.append(sample)
        self.sounds['beacon_mono'] = beacon_buf  # Store mono for panning later
        
        # Menu move: 600Hz sine
        move_buf = self._make_tone(600, 0.08, 0.2, 'sine')
        self.sounds['menu_move'] = pygame.mixer.Sound(buffer=self._pan_stereo(move_buf, 0.0).tobytes())
        
        # Menu select: 800Hz then 1200Hz
        select_buf = self._make_tone(800, 0.06, 0.25, 'sine')
        select_buf2 = self._make_tone(1200, 0.1, 0.2, 'sine')
        # Pad select_buf to match length
        while len(select_buf) < len(select_buf2):
            select_buf.append(0)
        combined = array.array('h')
        for i in range(len(select_buf)):
            combined.append(select_buf[i])
            if i < len(select_buf2):
                combined.append(select_buf[i] + select_buf2[i])
            else:
                combined.append(select_buf[i])
        self.sounds['menu_select'] = pygame.mixer.Sound(buffer=self._pan_stereo(combined, 0.0).tobytes())
        
        # Menu back: 500Hz then 350Hz
        back_buf = self._make_tone(500, 0.08, 0.2, 'sine')
        back_buf2 = self._make_tone(350, 0.12, 0.15, 'sine')
        combined = array.array('h')
        for i in range(max(len(back_buf), len(back_buf2))):
            v1 = back_buf[i] if i < len(back_buf) else 0
            v2 = back_buf2[i] if i < len(back_buf2) else 0
            combined.append(v1 + v2)
        self.sounds['menu_back'] = pygame.mixer.Sound(buffer=self._pan_stereo(combined, 0.0).tobytes())
        
        # Menu open: ascending tones
        open_buf = self._make_tone(400, 0.1, 0.2, 'sine')
        open_buf2 = self._make_tone(600, 0.1, 0.2, 'sine')
        open_buf3 = self._make_tone(800, 0.15, 0.2, 'sine')
        combined = array.array('h')
        max_len = max(len(open_buf), len(open_buf2), len(open_buf3))
        for i in range(max_len):
            v1 = open_buf[i] if i < len(open_buf) else 0
            v2 = open_buf2[i] if i < len(open_buf2) else 0
            v3 = open_buf3[i] if i < len(open_buf3) else 0
            combined.append((v1 + v2 + v3) // 3)
        self.sounds['menu_open'] = pygame.mixer.Sound(buffer=self._pan_stereo(combined, 0.0).tobytes())
        
        # Collision: low thud + noise
        thud_buf = self._make_tone(120, 0.08, 0.2, 'sawtooth')
        noise_buf = self._make_noise(0.05, 0.1)
        combined = array.array('h')
        for i in range(max(len(thud_buf), len(noise_buf))):
            v1 = thud_buf[i] if i < len(thud_buf) else 0
            v2 = noise_buf[i] if i < len(noise_buf) else 0
            combined.append(v1 + v2)
        self.sounds['collision'] = pygame.mixer.Sound(buffer=self._pan_stereo(combined, 0.0).tobytes())
        
        # Error: low buzz
        error_buf = self._make_tone(150, 0.15, 0.2, 'square')
        self.sounds['error'] = pygame.mixer.Sound(buffer=self._pan_stereo(error_buf, 0.0).tobytes())

    def play(self, name):
        """Play a sound centered."""
        if name in self.sounds:
            self.sounds[name].play()

    def play_panned(self, name, pan=0.0):
        """Play a sound with panning. pan=-1 (left) to 1 (right)."""
        if name == 'beacon_mono' and 'beacon_mono' in self.sounds:
            mono_buf = self.sounds['beacon_mono']
            stereo_buf = self._pan_stereo(mono_buf, pan)
            stereo_buf = self._add_itd(stereo_buf, pan)
            sound = pygame.mixer.Sound(buffer=stereo_buf.tobytes())
            sound.play()
