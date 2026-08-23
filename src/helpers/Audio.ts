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
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicStep = 0;
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

        // Music sits on its own bus, well under the effects, so a chord never competes
        // with the sound of a job being finished.
        const music = this.ctx.createGain();
        music.gain.value = 0.34;
        music.connect(gain);
        this.musicBus = music;
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
    this.syncMusic();
  }

  /** Starts or stops the background music to match the settings. */
  syncMusic(): void {
    const wanted = gameState.settings.sound && gameState.settings.music;
    if (wanted && !this.musicTimer) this.startMusic();
    else if (!wanted && this.musicTimer) this.stopMusic();
  }

  stopMusic(): void {
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
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

  /* ---------------------------------------------------------------------- music --- */

  /**
   * A slow ambient bed rather than a tune.
   *
   * A looping melody in a game a child replays for weeks becomes unbearable for whoever
   * else is in the room, so this is generative: a warm pad moving through four chords, with
   * occasional single notes from the same pentatonic set. It never repeats exactly and it
   * has no hook to get stuck in anyone's head.
   */
  private startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || !this.musicBus) return;

    // A major pentatonic set; every chord below is drawn from it, so nothing can clash.
    const CHORDS = [
      [220.0, 277.2, 329.6],  // A  C# E
      [246.9, 293.7, 370.0],  // B  D  F#
      [164.8, 220.0, 277.2],  // E  A  C#
      [196.0, 246.9, 293.7],  // G  B  D
    ];
    const SPARKLE = [659.3, 740.0, 880.0, 987.8, 1108.7];

    const bar = 9.5;

    const playBar = () => {
      const now = ctx.currentTime;
      const chord = CHORDS[this.musicStep % CHORDS.length];
      this.musicStep++;

      for (const freq of chord) {
        // two slightly detuned voices per note give the pad some movement
        for (const detune of [-3, 3]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = detune;

          // long fade in and out, so chords cross over rather than change
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.075, now + bar * 0.35);
          gain.gain.linearRampToValueAtTime(0.0001, now + bar);

          osc.connect(gain);
          gain.connect(this.musicBus!);
          osc.start(now);
          osc.stop(now + bar + 0.1);
        }
      }

      // one or two soft notes over the chord, at unpredictable moments
      const notes = Math.random() < 0.45 ? 2 : 1;
      for (let i = 0; i < notes; i++) {
        const at = now + 1 + Math.random() * (bar - 2.5);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.05, at + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
        osc.connect(gain);
        gain.connect(this.musicBus!);
        osc.start(at);
        osc.stop(at + 1.7);
      }

      // schedule the next bar slightly early so the fades overlap
      this.musicTimer = setTimeout(playBar, (bar - 1.2) * 1000);
    };

    playBar();
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

  /** A plate put down in front of somebody. */
  serve(): void {
    this.note(660, 0, 0.09, 0.09, 'sine', 880);
    this.noise(0.03, 0.07, 0.04, 'highpass', 3000);
  }

  /* ---------------------------------------------------------------------- voices --- */

  /**
   * One syllable of gibberish.
   *
   * A sawtooth through a narrow bandpass is the cheapest thing that reads as a voice
   * rather than a beep: the filter picks out a band the way a mouth does, and gliding both
   * the pitch and the band across the syllable gives it the shape of a spoken sound.
   */
  private syllable(freq: number, start: number, duration: number, peak: number, glideTo: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(glideTo, t + duration);

    // the "mouth": a band that moves with the pitch, which is what turns a buzz into a vowel
    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.Q.value = 5;
    formant.frequency.setValueAtTime(freq * 3.4, t);
    formant.frequency.linearRampToValueAtTime(glideTo * 2.6, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.014);
    gain.gain.setValueAtTime(peak, t + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /**
   * Guest gibberish — the sound the original GTA made when somebody spoke.
   *
   * This replaced Danish speech synthesis. A real voice sounded like a station
   * announcement whenever a device had a flat da-DK voice installed, and it read the text
   * a child cannot read anyway. Nonsense syllables carry the same information — somebody
   * is talking to you, and roughly how much they have to say — with none of that, and they
   * are funny, which a five-year-old cares about more than diction.
   *
   * `voice` shifts the whole thing up or down so two guests never sound like one guest, and
   * `startAt` delays it, so three guests all opening their mouths on the same frame take
   * turns instead of talking over each other.
   */
  babble(syllables = 4, voice = 1, startAt = 0): void {
    if (!gameState.settings.voices) return;

    const base = 152 * voice;
    // a few notes of a pentatonic-ish set, so the babble has a shape rather than a wobble
    const steps = [1, 1.12, 0.9, 1.26, 0.8, 1.05];
    const count = Math.max(2, Math.min(8, Math.round(syllables)));

    let at = startAt;
    for (let i = 0; i < count; i++) {
      const length = 0.062 + Math.random() * 0.055;
      const from = base * steps[Math.floor(Math.random() * steps.length)];
      // the last syllable falls away, the way a sentence ends
      const to = i === count - 1 ? from * 0.78 : from * (0.88 + Math.random() * 0.3);
      this.syllable(from, at, length, 0.075, to);
      at += length + 0.028 + Math.random() * 0.035;
    }
  }

  /** A grumble: the same gibberish, lower and slower. */
  grumble(voice = 1, startAt = 0): void {
    this.babble(3, voice * 0.72, startAt);
  }
}

export const audio = new Audio();
