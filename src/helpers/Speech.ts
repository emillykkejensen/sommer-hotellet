import { gameState } from '../state/GameState';

/**
 * Danish read-aloud.
 *
 * The target child usually cannot read the prompt, so every task is spoken. This uses the
 * browser's own speech synthesis: no assets, no network, and da-DK voices ship with iOS,
 * macOS, Android and Windows. Where no Danish voice exists we stay silent rather than
 * reading Danish text with an English voice, which is worse than nothing.
 *
 * This is synthesis, not narration. A recorded voice would be warmer, but it would also be
 * a few hundred audio files to write, record and ship — so instead the effort goes into
 * picking the best voice the device has and pacing it like someone reading to a child.
 */

let voice: SpeechSynthesisVoice | null | undefined;

/**
 * Best available Danish voice.
 *
 * Prefers a `da-DK` voice over a generic `da`, and a local one over a network one — network
 * voices are usually better quality but stall on a slow connection, and a prompt that
 * arrives two seconds late is worse than a flatter one that arrives now.
 */
function danishVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;

  const synth = window.speechSynthesis;
  if (!synth) return (voice = null);

  const voices = synth.getVoices();
  if (voices.length === 0) return null; // not loaded yet; try again on the next call

  const danish = voices.filter(v => v.lang?.toLowerCase().startsWith('da'));
  if (danish.length === 0) return (voice = null);

  const score = (v: SpeechSynthesisVoice): number => {
    let points = 0;
    if (v.lang?.toLowerCase() === 'da-dk') points += 4;
    if (v.localService) points += 2;
    // platform names for the higher-quality Danish voices
    if (/sara|magnus|enhanced|premium|neural/i.test(v.name)) points += 1;
    return points;
  };

  return (voice = [...danish].sort((a, b) => score(b) - score(a))[0]);
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

/**
 * Splits a prompt into the pieces a person would pause between.
 *
 * Read as one run, "Der kommer 2 voksne og 3 børn. Hvor mange nøgler skal du hente?" comes
 * out as a single breathless sentence. Split at the punctuation and the question lands.
 */
function phrases(textToSay: string): string[] {
  return textToSay
    .split(/(?<=[.!?:])\s+/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function speak(textToSay: string): void {
  if (!gameState.settings.speak || !canSpeak()) return;

  const synth = window.speechSynthesis;
  const chosen = danishVoice();

  try {
    synth.cancel();

    const parts = phrases(textToSay);
    // A longer prompt gets read a little slower; a two-word hint does not need to crawl.
    const rate = textToSay.length > 70 ? 0.86 : 0.94;

    parts.forEach((part, i) => {
      const utterance = new SpeechSynthesisUtterance(part);
      utterance.lang = 'da-DK';
      if (chosen) utterance.voice = chosen;
      utterance.rate = rate;
      utterance.pitch = 1.05;
      // a beat between sentences, so a question reads as a question
      if (i > 0) utterance.text = ` ${part}`;
      synth.speak(utterance);
    });
  } catch {
    // speech is a nicety; never let it break a task
  }
}

export function stopSpeaking(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

/** Voices load asynchronously in some browsers; warm the list up early. */
export function primeVoices(): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  const refresh = () => { voice = undefined; danishVoice(); };
  refresh();
  synth.addEventListener?.('voiceschanged', refresh, { once: true });
}
