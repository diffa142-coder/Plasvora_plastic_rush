// Efek suara kartun prosedural menggunakan Web Audio API (tanpa butuh file audio eksternal)

class CartoonAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(value) {
    this.enabled = value;
  }

  playTone(freqStart, freqEnd, duration, type = 'sine', gainPeak = 0.14, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playSwipe() {
    this.playTone(340, 620, 0.08, 'triangle', 0.09);
  }

  playJump() {
    this.playTone(280, 740, 0.15, 'sine', 0.12);
  }

  playKick() {
    this.playTone(190, 80, 0.09, 'triangle', 0.18);
    this.playTone(460, 720, 0.08, 'sine', 0.09, 0.02);
  }

  playScore() {
    // Suara ceria saat sampah kresek masuk ke tong sampah
    this.playTone(587, 784, 0.11, 'sine', 0.15, 0);
    this.playTone(880, 1174, 0.16, 'triangle', 0.14, 0.07);
  }

  playCoin() {
    this.playTone(987, 1318, 0.1, 'sine', 0.11);
  }

  playCrash() {
    // Suara bonk kartun lucu seperti di video referensi
    this.playTone(720, 140, 0.24, 'sawtooth', 0.13, 0);
    this.playTone(150, 55, 0.22, 'square', 0.16, 0.18);
  }

  playStart() {
    this.playTone(440, 440, 0.08, 'triangle', 0.11, 0);
    this.playTone(554, 554, 0.08, 'triangle', 0.11, 0.08);
    this.playTone(659, 880, 0.15, 'triangle', 0.13, 0.16);
  }

  playThrow() {
    // Suara si pembuang sampah melempar rintangan ke lintasan
    this.playTone(520, 260, 0.14, 'sine', 0.1);
  }
}

export const audio = new CartoonAudio();
