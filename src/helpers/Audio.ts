import { gameState } from '../state/GameState';

/**
 * Sound effects, synthesised rather than loaded.
 *
 * No audio files means no download, no licensing and no cache to warm — which matters for
 * a game that otherwise ships zero assets. Everything routes through one gain node and a
 * limiter, so overlapping sounds (a child tapping fast) stay gentle instead of clipping.
 *
 * Browsers start an AudioContext suspended until a user gesture, so `unlock()` is wired to
 * the first pointer down and every play attempt resumes a context that has drifted back to
 * suspended (which happens when a tab is backgrounded).
 */
class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private broken = false;

  private ensure(): AudioContext | null {
    if (this.broken) return null;
    if (!gameState.settings.sound) return null;

    if (!this.ctx) {
      try {
        const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
        if (!Ctor) {
          this.broken = true;
          return null;
        }
        this.ctx = new Ctor();

        const gain = this.ctx.createGain();
        gain.gain.value = 0.5;

        // keeps a fast tapper from stacking into distortion
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 6;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.2;

        gain.connect(limiter);
        limiter.connect(this.ctx.destination);
        this.master = gain;
      } catch {
        this.broken = true;
        return null;
      }
    }

    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Call from the first user gesture, so the context is running before anything plays. */
  unlock(): void {
    if (!gameState.settings.sound) return;
    this.ensure();
  }

  available(): boolean {
    if (this.broken) return false;
    return typeof window !== 'undefined'
      && !!(window.AudioContext ?? (window as any).webkitAudioContext);
  }

  /* ------------------------------------------------------------- building blocks --- */

  /** One shaped note. `type` picks the waveform; the envelope is always click-free. */
  private note(
    freq: number,
    start: number,
    duration: number,
    peak: number,
    type: OscillatorType = 'sine',
    endFreq?: number
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    // a few ms of attack removes the click a hard start makes
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.012, duration * 0.3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** Filtered noise, for water and frying. */
  private noise(
    start: number,
    duration: number,
    peak: number,
    filter: 'lowpass' | 'highpass',
    freqFrom: number,
    freqTo = freqFrom
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t = ctx.currentTime + start;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freqFrom, t);
    if (freqTo !== freqFrom) biquad.frequency.exponentialRampToValueAtTime(freqTo, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.master);
    source.start(t);
  }

  /* --------------------------------------------------------------------- sounds --- */

  /** Every tap. Deliberately almost inaudible — it acknowledges, it does not announce. */
  tap(): void {
    this.note(520, 0, 0.05, 0.05, 'sine', 660);
  }

  /** A job finished: bed made, towel laid, ingredient added. */
  pop(): void {
    this.note(400, 0, 0.1, 0.13, 'sine', 720);
    this.note(800, 0.02, 0.09, 0.05, 'triangle', 1200);
  }

  /** A star landed in the counter. Rises a little with the size of the award. */
  star(count = 1): void {
    const base = 880;
    const steps = Math.min(count, 4);
    for (let i = 0; i < steps; i++) {
      this.note(base * Math.pow(1.19, i), i * 0.07, 0.22, 0.11, 'triangle');
    }
  }

  /** Reception bell: a struck metal partial stack. */
  bell(): void {
    this.note(1046, 0, 1.1, 0.16, 'sine');
    this.note(2093, 0, 0.7, 0.07, 'sine');
    this.note(3140, 0, 0.4, 0.035, 'sine');
    this.noise(0, 0.05, 0.05, 'highpass', 4000);
  }

  splash(): void {
    this.noise(0, 0.42, 0.22, 'lowpass', 2600, 380);
    this.note(300, 0.02, 0.16, 0.06, 'sine', 130);
  }

  sparkle(): void {
    [1568, 1976, 2349, 2637].forEach((f, i) => this.note(f, i * 0.055, 0.2, 0.06, 'sine'));
  }

  sizzle(): void {
    this.noise(0, 0.55, 0.1, 'highpass', 3200, 5200);
  }

  /** A task answered correctly: a small rising arpeggio. */
  success(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.note(f, i * 0.09, 0.3, 0.13, 'triangle'));
  }

  /**
   * A task answered wrongly. Two soft descending notes — a nudge, not a buzzer. Nothing in
   * this game should sound like being told off.
   */
  nudge(): void {
    this.note(392, 0, 0.16, 0.08, 'sine');
    this.note(330, 0.11, 0.22, 0.07, 'sine');
  }

  /** Something bought in the shop. */
  purchase(): void {
    this.note(784, 0, 0.12, 0.11, 'triangle');
    this.note(1046, 0.08, 0.16, 0.11, 'triangle');
    this.note(1318, 0.16, 0.3, 0.09, 'triangle');
    this.noise(0, 0.06, 0.04, 'highpass', 5000);
  }

  /** Not enough stars. A soft low thud, no sting. */
  denied(): void {
    this.note(196, 0, 0.18, 0.09, 'sine', 165);
  }
}

export const audio = new Audio();
