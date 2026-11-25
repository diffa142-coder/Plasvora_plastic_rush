// Efek suara kartun prosedural menggunakan Web Audio API (tanpa butuh file audio eksternal)

class CartoonAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmActive = false;
    this.bgmMode = 'normal'; // 'normal' | 'boss'
    this.bgmStep = 0;
    this.bgmTimer = null;
    this.stepToggle = false;
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
    if (!value) {
      this.stopBgm();
    } else if (this.bgmActive) {
      this.startBgm(this.bgmMode);
    }
  }

  startBgm(mode = 'normal') {
    this.bgmActive = true;
    this.bgmMode = mode;
    clearInterval(this.bgmTimer);
    if (!this.enabled) return;

    const normalMelody = [523, 659, 784, 659, 587, 784, 880, 784, 659, 784, 1046, 784, 587, 659, 523, 392];
    const normalBass = [261, 261, 196, 196, 220, 220, 174, 196];
    const bossMelody = [440, 523, 440, 659, 440, 587, 523, 493, 440, 523, 440, 784, 659, 587, 523, 493];
    const bossBass = [220, 220, 165, 165, 196, 196, 147, 165];

    const intervalMs = mode === 'boss' ? 150 : 185;

    this.bgmTimer = setInterval(() => {
      if (!this.enabled || !this.bgmActive) return;
      const mel = this.bgmMode === 'boss' ? bossMelody : normalMelody;
      const bas = this.bgmMode === 'boss' ? bossBass : normalBass;
      const idx = this.bgmStep % mel.length;
      const note = mel[idx];

      // Melodi utama ceria / tegang lembut
      this.playTone(
        note,
        note * 1.01,
        0.11,
        this.bgmMode === 'boss' ? 'sawtooth' : 'triangle',
        this.bgmMode === 'boss' ? 0.032 : 0.038
      );

      // Ketukan bass setiap 2 langkah
      if (idx % 2 === 0) {
        const bNote = bas[(idx / 2) % bas.length];
        this.playTone(bNote, bNote * 0.98, 0.14, 'sine', 0.045);
      }

      // Ketukan ritme hi-hat / perkusi ringan setiap 4 langkah
      if (idx % 4 === 2) {
        this.playTone(1200, 420, 0.04, 'triangle', 0.025);
      }

      this.bgmStep += 1;
    }, intervalMs);
  }

  setBgmMode(mode) {
    if (this.bgmMode === mode && this.bgmTimer) return;
    this.bgmMode = mode;
    if (this.bgmActive && this.enabled) {
      this.startBgm(mode);
    }
  }

  stopBgm() {
    clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }

  playFootstep() {
    this.stepToggle = !this.stepToggle;
    const f1 = this.stepToggle ? 145 : 170;
    this.playTone(f1, f1 * 0.65, 0.045, 'triangle', 0.045);
  }

  playTrapLand() {
    this.playTone(135, 62, 0.075, 'sine', 0.075);
  }

  playButton() {
    this.playTone(520, 760, 0.06, 'triangle', 0.08);
  }

  playVictory() {
    this.playTone(523, 523, 0.09, 'triangle', 0.13, 0);
    this.playTone(659, 659, 0.09, 'triangle', 0.13, 0.09);
    this.playTone(784, 784, 0.09, 'triangle', 0.13, 0.18);
    this.playTone(1046, 1174, 0.22, 'triangle', 0.15, 0.27);
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

  playBossEnter() {
    this.playTone(220, 310, 0.18, 'sawtooth', 0.12, 0);
    this.playTone(220, 310, 0.18, 'sawtooth', 0.12, 0.2);
    this.playTone(310, 460, 0.28, 'sawtooth', 0.14, 0.4);
  }

  playExplosion() {
    this.playTone(170, 38, 0.35, 'sawtooth', 0.22, 0);
    this.playTone(110, 30, 0.4, 'square', 0.16, 0.04);
  }

  playBazookaShoot() {
    this.playTone(480, 120, 0.18, 'sawtooth', 0.18, 0);
    this.playTone(320, 680, 0.22, 'triangle', 0.12, 0.05);
  }
}

export const audio = new CartoonAudio();
