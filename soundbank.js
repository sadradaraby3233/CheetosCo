// CheetosCo — Procedural Sound Bank (DSP)
// Every sound in the game is generated here. No audio files.

const SoundBank = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // --- Core helpers ---

  function playTone(freq, duration, type, volume, startDelay) {
    const c = getCtx();
    const t = c.currentTime + (startDelay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  function playNoise(duration, volume, startDelay) {
    const c = getCtx();
    const t = c.currentTime + (startDelay || 0);
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(gain);
    gain.connect(c.destination);
    src.start(t);
  }

  // --- Menu navigation sounds ---

  function menuMove() {
    playTone(600, 0.08, 'sine', 0.2);
  }

  function menuSelect() {
    playTone(800, 0.06, 'sine', 0.25);
    playTone(1200, 0.1, 'sine', 0.2, 0.06);
  }

  function menuBack() {
    playTone(500, 0.08, 'sine', 0.2);
    playTone(350, 0.12, 'sine', 0.15, 0.06);
  }

  function menuOpen() {
    playTone(400, 0.1, 'sine', 0.2);
    playTone(600, 0.1, 'sine', 0.2, 0.08);
    playTone(800, 0.15, 'sine', 0.2, 0.16);
  }

  function menuClose() {
    playTone(800, 0.1, 'sine', 0.2);
    playTone(600, 0.1, 'sine', 0.2, 0.08);
    playTone(400, 0.15, 'sine', 0.15, 0.16);
  }

  // --- UI feedback sounds ---

  function click() {
    playTone(1000, 0.04, 'square', 0.15);
  }

  function confirm() {
    playTone(523, 0.1, 'sine', 0.2);
    playTone(659, 0.1, 'sine', 0.2, 0.1);
    playTone(784, 0.15, 'sine', 0.25, 0.2);
  }

  function error() {
    playTone(200, 0.15, 'sawtooth', 0.2);
    playTone(150, 0.2, 'sawtooth', 0.15, 0.12);
  }

  function warning() {
    playTone(440, 0.12, 'triangle', 0.2);
    playTone(440, 0.12, 'triangle', 0.2, 0.2);
  }

  function success() {
    playTone(523, 0.08, 'sine', 0.2);
    playTone(659, 0.08, 'sine', 0.2, 0.08);
    playTone(784, 0.08, 'sine', 0.2, 0.16);
    playTone(1047, 0.2, 'sine', 0.3, 0.24);
  }

  function fail() {
    playTone(400, 0.12, 'sawtooth', 0.2);
    playTone(300, 0.12, 'sawtooth', 0.18, 0.1);
    playTone(200, 0.25, 'sawtooth', 0.15, 0.2);
  }

  // --- Game sounds ---

  function ambient() {
    playNoise(3, 0.03);
    playTone(80, 3, 'sine', 0.05);
  }

  function pickup() {
    playTone(800, 0.05, 'sine', 0.2);
    playTone(1200, 0.08, 'sine', 0.25, 0.04);
    playTone(1600, 0.1, 'sine', 0.2, 0.1);
  }

  function drop() {
    playTone(600, 0.06, 'sine', 0.2);
    playTone(400, 0.1, 'sine', 0.15, 0.05);
  }

  function step() {
    playNoise(0.06, 0.08);
  }

  function doorOpen() {
    playTone(200, 0.3, 'sine', 0.1);
    playTone(300, 0.3, 'sine', 0.08, 0.15);
    playNoise(0.2, 0.05, 0.1);
  }

  function doorClose() {
    playNoise(0.15, 0.12);
    playTone(150, 0.2, 'sine', 0.1, 0.05);
  }

  function timerTick() {
    playTone(1000, 0.03, 'sine', 0.15);
  }

  function timerAlarm() {
    for (let i = 0; i < 4; i++) {
      playTone(880, 0.1, 'square', 0.2, i * 0.2);
      playTone(660, 0.1, 'square', 0.2, i * 0.2 + 0.1);
    }
  }

  // --- Speech helper ---

  function speak(text, rate, onEnd) {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate || 1;
    u.onend = onEnd || null;
    speechSynthesis.speak(u);
  }

  // --- Public API ---

  return {
    getCtx,
    playTone,
    playNoise,
    // Menu
n    menuMove,
    menuSelect,
    menuBack,
    menuOpen,
    menuClose,
    // UI
    click,
    confirm,
    error,
    warning,
    success,
    fail,
    // Game
    ambient,
    pickup,
    drop,
    step,
    doorOpen,
    doorClose,
    timerTick,
    timerAlarm,
    // Speech
    speak
  };
})();
