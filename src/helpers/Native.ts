import type Phaser from 'phaser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { goBack } from './Navigation';

/**
 * Everything the Android build needs that a browser gives for free.
 *
 * The game is the same code in both places; this is the thin layer that makes a WebView
 * behave like a game console rather than a browser tab. On the web every function here is
 * either a no-op or falls through to the browser API, so nothing is branched at the call
 * site.
 */

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ read-aloud --- */

/**
 * `speechSynthesis` does not exist in an Android WebView.
 *
 * This is not a bug in the game: the Web Speech API has never been implemented in WebView
 * (only in Chrome proper), so `window.speechSynthesis` is `undefined` inside the app and
 * every prompt would go silent. Android's own text-to-speech engine is available through a
 * plugin, so on native we talk to that instead. Which Danish voices exist then depends on
 * what the phone has installed under Settings → Text-to-speech.
 */
let nativeVoiceChecked = false;
let nativeDanish = false;

export async function primeNativeSpeech(): Promise<void> {
  if (!isNative() || nativeVoiceChecked) return;
  nativeVoiceChecked = true;
  try {
    const { languages } = await TextToSpeech.getSupportedLanguages();
    nativeDanish = languages.some(lang => lang.toLowerCase().startsWith('da'));
  } catch {
    nativeDanish = false;
  }
}

/** Whether the native engine has a Danish voice. Reading Danish aloud in English is worse
 * than staying quiet, so the same rule as the web path applies here. */
export function canSpeakNative(): boolean {
  return isNative() && nativeDanish;
}

export function speakNative(textToSay: string, rate: number): void {
  if (!canSpeakNative()) return;
  // Fire and forget: a prompt that fails to speak must never hold up the task.
  TextToSpeech.stop()
    .catch(() => undefined)
    .then(() =>
      TextToSpeech.speak({
        text: textToSay,
        lang: 'da-DK',
        rate,
        pitch: 1.05,
        category: 'playback',
      })
    )
    .catch(() => undefined);
}

export function stopSpeakingNative(): void {
  if (!isNative()) return;
  TextToSpeech.stop().catch(() => undefined);
}

/* ------------------------------------------------------------------- save file --- */

const MIRROR_KEY = 'save';

/**
 * A second copy of the save in native storage.
 *
 * `localStorage` inside a WebView is not durable the way a file is — Android can clear web
 * storage to reclaim space, and some devices drop it when the app updates. Losing 40 stars
 * that took a week to earn is the kind of thing that ends a game's life in a household, so
 * every write is mirrored into SharedPreferences and read back if localStorage comes up
 * empty on a later launch.
 */
export function mirrorSave(json: string): void {
  if (!isNative()) return;
  Preferences.set({ key: MIRROR_KEY, value: json }).catch(() => undefined);
}

export async function restoreSaveIfEmpty(storageKey: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    if (window.localStorage.getItem(storageKey)) return false;
    const { value } = await Preferences.get({ key: MIRROR_KEY });
    if (!value) return false;
    window.localStorage.setItem(storageKey, value);
    return true;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- app shell --- */

/**
 * Locks the app to landscape, hides the system bars, keeps the screen awake and makes the
 * hardware back button mean what the on-screen arrow means.
 *
 * Each piece is guarded on its own: an older device without one of these APIs should lose
 * that single behaviour, not the whole setup.
 */
export async function setupNative(game: Phaser.Game): Promise<void> {
  if (!isNative()) return;

  try {
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    // some devices refuse the lock; the game still scales to whatever it gets
  }

  try {
    // A child reading a task does not touch the screen for half a minute, and a display
    // that dims mid-question reads as the game breaking.
    await KeepAwake.keepAwake();
  } catch {
    // ignore
  }

  try {
    await App.addListener('backButton', () => {
      if (goBack(game) === 'exit') App.exitApp();
    });
  } catch {
    // ignore
  }

  await primeNativeSpeech();
}
