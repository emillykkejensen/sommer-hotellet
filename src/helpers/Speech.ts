import { gameState } from '../state/GameState';

/**
 * Danish read-aloud.
 *
 * The target child usually cannot read the prompt, so every task is spoken. This uses the
 * browser's own speech synthesis: no assets, no network, and da-DK voices ship with iOS,
 * macOS, Android and Windows. Where no Danish voice exists we stay silent rather than
 * reading Danish text with an English voice, which is worse than nothing.
 */

let voice: SpeechSynthesisVoice | null | undefined;

function danishVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice;
  const synth = window.speechSynthesis;
  if (!synth) return (voice = null);
  const voices = synth.getVoices();
  if (voices.length === 0) return null; // not loaded yet; try again on the next call
  voice = voices.find(v => v.lang?.toLowerCase().startsWith('da')) ?? null;
  return voice;
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

export function speak(textToSay: string): void {
  if (!gameState.settings.speak || !canSpeak()) return;

  const synth = window.speechSynthesis;
  const v = danishVoice();

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSay);
    utterance.lang = 'da-DK';
    if (v) utterance.voice = v;
    // A little slower than default — these are short instructions for a young listener.
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    synth.speak(utterance);
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
