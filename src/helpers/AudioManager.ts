/**
 * Synthesised sound effects — no audio files, so the game still loads instantly.
 *
 * Two things this used to be missing, which is why nothing imported it:
 *
 *  1. **An unlock.** Browsers create an `AudioContext` in the `suspended` state and only
 *     resume it inside a user gesture. Calling `play()` before that silently does
 *     nothing, so the sound engine appeared broken and got left disconnected.
 *  2. **A mute the player can find.** A children's game that starts making noise with no
 *     visible off switch gets muted at the operating system instead, which mutes the
 *     rest of the device too.
 *
 * Everything runs through one master gain, so muting is a single ramp rather than a
 * flag checked in six places.
 */

const MUTE_KEY = 'sommer-hotellet-muted';

export type Sfx =
  | 'click' | 'bell' | 'splash' | 'sparkle' | 'sizzle'
  | 'success' | 'star' | 'pop' | 'rank';

class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private unlocked = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // private browsing — default to sound on
    }
  }

  // ---------- lifecycle ----------

  private ctx(): AudioContext | null {
    if (this.context) return this.context;
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
    }
    return this.context;
  }

  /**
   * Called from the first pointer gesture anywhere in the game. Safe to call repeatedly;
   * a context that has already resumed just resolves again.
   */
  unlock(): void {
    const ctx = this.ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    this.unlocked = true;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // not persisting the preference is survivable
    }
    const ctx = this.ctx();
    if (ctx && this.master) {
      // Ramped rather than snapped, so muting mid-effect does not click.
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.02);
    }
  }

  toggle(): boolean {
    this.setMuted(!this.muted);
    return !this.muted;
  }

  // ---------- primitives ----------

  private ready(): AudioContext | null {
    if (this.muted || !this.unlocked) return null;
    const ctx = this.ctx();
    if (!ctx || ctx.state !== 'running') return null;
    return ctx;
  }

  /** One shaped sine/triangle blip. Every melodic effect is built out of these. */
  private tone(
    freq: number,
    start: number,
    length: number,
    peak: number,
    type: OscillatorType = 'sine',
    glideTo?: number
  ): void {
    const ctx = this.ready();
    if (!ctx || !this.master) return;

    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + length);

    // Short attack rather than an instant jump — a square-edged envelope clicks.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  /** Filtered noise burst — water, sizzling, anything without a pitch. */
  private noise(
    start: number,
    length: number,
    peak: number,
    filter: BiquadFilterType,
    cutoff: number
  ): void {
    const ctx = this.ready();
    if (!ctx || !this.master) return;

    const t = ctx.currentTime + start;
    const frames = Math.floor(ctx.sampleRate * length);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = filter;
    band.frequency.setValueAtTime(cutoff, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    source.connect(band);
    band.connect(gain);
    gain.connect(this.master);
    source.start(t);
  }

  // ---------- effects ----------

  play(name: Sfx): void {
    switch (name) {
      case 'click':
        this.tone(620, 0, 0.07, 0.16, 'sine', 840);
        break;

      case 'pop':
        this.tone(440, 0, 0.09, 0.18, 'triangle', 720);
        break;

      case 'bell':
        // Two partials a fifth apart is what makes it read as a desk bell rather than a beep.
        this.tone(1320, 0, 0.5, 0.16, 'sine');
        this.tone(1980, 0.005, 0.42, 0.07, 'sine');
        break;

      case 'splash':
        this.noise(0, 0.32, 0.18, 'lowpass', 1600);
        this.tone(300, 0.02, 0.18, 0.08, 'sine', 140);
        break;

      case 'sparkle':
        [0, 0.07, 0.14].forEach((d, i) => this.tone(1180 + i * 340, d, 0.18, 0.1));
        break;

      case 'sizzle':
        this.noise(0, 0.55, 0.09, 'highpass', 3200);
        break;

      case 'star':
        // The sound a single earned star makes: one short rising blip.
        this.tone(880, 0, 0.14, 0.14, 'triangle', 1320);
        break;

      case 'success':
        // C5 E5 G5 — an arpeggio, so finishing something resolves rather than just stops.
        [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, i * 0.1, 0.28, 0.15, 'triangle'));
        break;

      case 'rank':
        // A longer fanfare for a new rank: the arpeggio plus the octave above.
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, i * 0.11, 0.4, 0.16, 'triangle'));
        this.tone(1318.5, 0.44, 0.5, 0.1, 'sine');
        break;
    }
  }
}

export const audioManager = new AudioManager();

/**
 * Hooks the first pointer gesture on the page to unlock the audio context.
 *
 * Bound to the window rather than to a scene so it survives every scene change, and
 * removed once it has fired.
 */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    audioManager.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

/** Shorthand used by scenes: `sfx('bell')`. */
export function sfx(name: Sfx): void {
  audioManager.play(name);
}
