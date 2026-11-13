class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(m: boolean) {
    this.muted = m;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.08,
    delay = 0
  ) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignore audio errors in restricted headless environments
    }
  }

  public playShoot() {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(460 * jitter, 110, 0.09, 'sawtooth', 0.07);
  }

  public playHit() {
    this.playTone(210, 75, 0.08, 'triangle', 0.09);
  }

  public playPickup() {
    this.playTone(523, 784, 0.09, 'square', 0.06);
    this.playTone(784, 1046, 0.12, 'square', 0.06, 0.07);
  }

  public playMissionAccept() {
    this.playTone(440, 440, 0.08, 'triangle', 0.08);
    this.playTone(659, 659, 0.14, 'triangle', 0.08, 0.09);
  }

  public playStepComplete() {
    this.playTone(587, 880, 0.12, 'triangle', 0.08);
  }

  public playLockPin() {
    this.playTone(920, 1240, 0.07, 'square', 0.06);
  }

  public playLockFail() {
    this.playTone(220, 130, 0.18, 'sawtooth', 0.08);
  }

  public playMissionPassed() {
    this.playTone(523.25, 523.25, 0.14, 'triangle', 0.09, 0);
    this.playTone(659.25, 659.25, 0.14, 'triangle', 0.09, 0.12);
    this.playTone(783.99, 783.99, 0.16, 'triangle', 0.09, 0.24);
    this.playTone(1046.5, 1046.5, 0.36, 'triangle', 0.1, 0.38);
  }

  public playMissionFailed() {
    this.playTone(311, 240, 0.22, 'sawtooth', 0.08, 0);
    this.playTone(220, 140, 0.35, 'sawtooth', 0.09, 0.2);
  }

  public playCarDoor() {
    this.playTone(180, 95, 0.09, 'triangle', 0.08);
  }
}

export const soundEngine = new SoundEngine();
