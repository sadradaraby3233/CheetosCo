// CheetosCo — Procedural Sound Bank (DSP + HRTF 3D Audio)

const SoundBank = (() => {
  let ctx = null;
  let listenerNode = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      listenerNode = ctx.listener;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // --- 3D Audio: Listener always faces north (-y in game = -z in audio) ---
  // Game: x=left/right, y=forward(-)/back(+), z=height
  // Audio: x=left/right, y=height, z=back(+)/forward(-)
  // Mapping: audio.x = game.x, audio.y = game.z, audio.z = game.y

  function updateListener(x, y, z) {
    const c = getCtx();
    if (!c.listener) return;
    if (c.listener.positionX) {
      c.listener.positionX.setValueAtTime(x, c.currentTime);
      c.listener.positionY.setValueAtTime(z, c.currentTime);
      c.listener.positionZ.setValueAtTime(y, c.currentTime);
      c.listener.forwardX.setValueAtTime(0, c.currentTime);
      c.listener.forwardY.setValueAtTime(0, c.currentTime);
      c.listener.forwardZ.setValueAtTime(-1, c.currentTime);
      c.listener.upX.setValueAtTime(0, c.currentTime);
      c.listener.upY.setValueAtTime(1, c.currentTime);
      c.listener.upZ.setValueAtTime(0, c.currentTime);
    } else if (c.listener.setPosition) {
      c.listener.setPosition(x, z, y);
      c.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
  }

  function makePanner(posX, posY, posZ, lightweight) {
    const c = getCtx();
    const p = c.createPanner();
    // Use equalpower for repeating sounds (beacon) to avoid CPU lag.
    // Use HRTF for one-off sounds.
    p.panningModel = lightweight ? 'equalpower' : 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1;
    p.maxDistance = 100;
    p.rolloffFactor = 1;
    if (p.positionX) {
      p.positionX.setValueAtTime(posX, c.currentTime);
      p.positionY.setValueAtTime(posZ, c.currentTime);
      p.positionZ.setValueAtTime(posY, c.currentTime);
    } else if (p.setPosition) {
      p.setPosition(posX, posZ, posY);
    }
    return p;
  }

  // --- Core helpers ---

  function playTone(freq, duration, type, volume, startDelay, pos3d) {
    const c = getCtx();
    const t = c.currentTime + (startDelay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    if (pos3d) {
      const pan = makePanner(pos3d.x, pos3d.y, pos3d.z);
      osc.connect(gain); gain.connect(pan); pan.connect(c.destination);
    } else {
      osc.connect(gain); gain.connect(c.destination);
    }
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  function playNoise(duration, volume, startDelay, pos3d) {
    const c = getCtx();
    const t = c.currentTime + (startDelay || 0);
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    if (pos3d) {
      const pan = makePanner(pos3d.x, pos3d.y, pos3d.z);
      src.connect(gain); gain.connect(pan); pan.connect(c.destination);
    } else {
      src.connect(gain); gain.connect(c.destination);
    }
    src.start(t);
    src.stop(t + duration + 0.01);
  }

  // --- Menu sounds ---
  function menuMove() { playTone(600, 0.08, 'sine', 0.2); }
  function menuSelect() { playTone(800, 0.06, 'sine', 0.25); playTone(1200, 0.1, 'sine', 0.2, 0.06); }
  function menuBack() { playTone(500, 0.08, 'sine', 0.2); playTone(350, 0.12, 'sine', 0.15, 0.06); }
  function menuOpen() { playTone(400, 0.1, 'sine', 0.2); playTone(600, 0.1, 'sine', 0.2, 0.08); playTone(800, 0.15, 'sine', 0.2, 0.16); }
  function menuClose() { playTone(800, 0.1, 'sine', 0.2); playTone(600, 0.1, 'sine', 0.2, 0.08); playTone(400, 0.15, 'sine', 0.15, 0.16); }

  // --- UI sounds ---
  function click() { playTone(1000, 0.04, 'square', 0.15); }
  function confirm() { playTone(523, 0.1, 'sine', 0.2); playTone(659, 0.1, 'sine', 0.2, 0.1); playTone(784, 0.15, 'sine', 0.25, 0.2); }
  function error() { playTone(200, 0.15, 'sawtooth', 0.2); playTone(150, 0.2, 'sawtooth', 0.15, 0.12); }
  function warning() { playTone(440, 0.12, 'triangle', 0.2); playTone(440, 0.12, 'triangle', 0.2, 0.2); }
  function success() { playTone(523, 0.08, 'sine', 0.2); playTone(659, 0.08, 'sine', 0.2, 0.08); playTone(784, 0.08, 'sine', 0.2, 0.16); playTone(1047, 0.2, 'sine', 0.3, 0.24); }
  function fail() { playTone(400, 0.12, 'sawtooth', 0.2); playTone(300, 0.12, 'sawtooth', 0.18, 0.1); playTone(200, 0.25, 'sawtooth', 0.15, 0.2); }

  // --- Game sounds ---
  function ambient() { playNoise(3, 0.03); playTone(80, 3, 'sine', 0.05); }
  function pickup() { playTone(800, 0.05, 'sine', 0.2); playTone(1200, 0.08, 'sine', 0.25, 0.04); playTone(1600, 0.1, 'sine', 0.2, 0.1); }
  function drop() { playTone(600, 0.06, 'sine', 0.2); playTone(400, 0.1, 'sine', 0.15, 0.05); }

  function step() {
    const c = getCtx();
    const t = c.currentTime;
    const bufferSize = Math.floor(c.sampleRate * 0.15);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 200, t);
    filter.Q.value = 1.5;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(filter); filter.connect(gain); gain.connect(c.destination);
    src.start(t); src.stop(t + 0.15);
  }

  function doorOpen() { playTone(200, 0.3, 'sine', 0.1); playTone(300, 0.3, 'sine', 0.08, 0.15); playNoise(0.2, 0.05, 0.1); }
  function doorClose() { playNoise(0.15, 0.12); playTone(150, 0.2, 'sine', 0.1, 0.05); }
  function timerTick() { playTone(1000, 0.03, 'sine', 0.15); }
  function timerAlarm() { for (let i = 0; i < 4; i++) { playTone(880, 0.1, 'square', 0.2, i * 0.2); playTone(660, 0.1, 'square', 0.2, i * 0.2 + 0.1); } }

  // --- Beacon: descending sweep with 3D position (lightweight panner) ---
  function beaconBeep(pos3d) {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    if (pos3d) {
      const pan = makePanner(pos3d.x, pos3d.y, pos3d.z, true);
      osc.connect(gain); gain.connect(pan); pan.connect(c.destination);
    } else {
      osc.connect(gain); gain.connect(c.destination);
    }
    osc.start(t); osc.stop(t + 0.15);
  }

  // --- Radar lock-on: ascending chirp ---
  function lockOn() {
    const c = getCtx();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t); osc.stop(t + 0.12);
  }

  // --- Dialog sounds ---
  function dialogOpen() {
    playTone(500, 0.1, 'sine', 0.2);
    playTone(700, 0.1, 'sine', 0.2, 0.08);
    playTone(900, 0.15, 'sine', 0.25, 0.16);
  }

  function dialogFinish() {
    playTone(900, 0.1, 'sine', 0.2);
    playTone(700, 0.1, 'sine', 0.2, 0.08);
    playTone(500, 0.15, 'sine', 0.15, 0.16);
  }

  // --- Speech ---
  let speechMode = localStorage.getItem('cheetos_speech_mode') || 'sr';
  function getSpeechMode() { return speechMode; }
  function setSpeechMode(mode) {
    speechMode = mode;
    localStorage.setItem('cheetos_speech_mode', mode);
  }

  function speak(text, rate, onEnd, interrupt) {
    if (typeof interrupt === 'undefined') interrupt = true;
    const mode = speechMode;
    const liveRegion = document.getElementById('tts-live');

    if (mode === 'sr') {
      if (liveRegion) {
        liveRegion.textContent = '';
        setTimeout(() => { liveRegion.textContent = text; }, 10);
      }
      if (onEnd) setTimeout(onEnd, Math.max(100, text.length * 40));
      return;
    }

    if (liveRegion) liveRegion.textContent = '';

    if (typeof speechSynthesis === 'undefined' || !window.SpeechSynthesisUtterance) {
      if (onEnd) setTimeout(onEnd, 100);
      return;
    }

    if (interrupt) {
      speechSynthesis.cancel();
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = rate || 1;
        u.onend = onEnd || null;
        u.onerror = () => { if (onEnd) onEnd(); };
        speechSynthesis.speak(u);
      }, 10);
    } else {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate || 1;
      u.onend = onEnd || null;
      u.onerror = () => { if (onEnd) onEnd(); };
      speechSynthesis.speak(u);
    }
  }

  // --- 8-bit chiptune menu music ---
  let musicInterval = null;
  let musicGain = null;

  function startMenuMusic() {
    if (musicInterval) return;
    const c = getCtx();
    musicGain = c.createGain();
    musicGain.connect(c.destination);
    musicGain.gain.setValueAtTime(1.0, c.currentTime);

    const melody = [
      659, 659, 0, 659, 0, 523, 659, 0,
      784, 0, 0, 0, 392, 0, 0, 0,
      523, 0, 0, 392, 0, 0, 330, 0,
      0, 440, 0, 494, 0, 466, 440, 0,
      392, 659, 784, 880, 0, 698, 784,
      0, 659, 0, 523, 587, 494, 0, 0,
      523, 0, 0, 392, 0, 0, 330, 0,
      0, 440, 0, 494, 0, 466, 440, 0,
      392, 659, 784, 880, 0, 698, 784,
      0, 659, 0, 523, 587, 494, 0, 0
    ];
    const bass = [
      196, 196, 196, 0, 196, 196, 196, 0,
      196, 0, 0, 0, 196, 0, 0, 0,
      262, 0, 0, 196, 0, 0, 165, 0,
      0, 220, 0, 247, 0, 233, 220, 0,
      196, 196, 196, 0, 196, 196, 196, 0,
      196, 0, 0, 0, 196, 0, 0, 0,
      262, 0, 0, 196, 0, 0, 165, 0,
      0, 220, 0, 247, 0, 233, 220, 0,
      196, 196, 196, 0, 196, 196, 196, 0,
      196, 0, 0, 0, 196, 0, 0, 0
    ];
    let step = 0;
    const bpm = 200;
    const interval = 60 / bpm * 1000 / 2;

    musicInterval = setInterval(() => {
      const t = c.currentTime;
      const note = melody[step % melody.length];
      const bassNote = bass[step % bass.length];
      if (note > 0) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(note, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.connect(g); g.connect(musicGain);
        o.start(t); o.stop(t + 0.15);
      }
      if (bassNote > 0) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(bassNote, t);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(musicGain);
        o.start(t); o.stop(t + 0.2);
      }
      step++;
    }, interval);
  }

  function stopMenuMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
    if (musicGain) { musicGain.disconnect(); musicGain = null; }
  }

  function fadeMusicAndStop(duration) {
    if (typeof duration === 'undefined') duration = 1.5;
    if (!musicGain || !musicInterval) return;
    const c = getCtx();
    musicGain.gain.cancelScheduledValues(c.currentTime);
    musicGain.gain.setValueAtTime(musicGain.gain.value, c.currentTime);
    musicGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    setTimeout(stopMenuMusic, duration * 1000);
  }

  return {
    getCtx, playTone, playNoise,
    menuMove, menuSelect, menuBack, menuOpen, menuClose,
    click, confirm, error, warning, success, fail,
    ambient, pickup, drop, step, beaconBeep, lockOn,
    dialogOpen, dialogFinish,
    doorOpen, doorClose, timerTick, timerAlarm,
    getSpeechMode, setSpeechMode, speak,
    startMenuMusic, stopMenuMusic, fadeMusicAndStop,
    updateListener
  };
})();
