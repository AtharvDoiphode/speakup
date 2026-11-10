export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let cachedVoice = null;

// The person's own choices from Settings (set by the auth context when they log in or save)
const speechPrefs = { voiceName: '', speechRate: 1 };
export function setSpeechPrefs({ voiceName = '', speechRate = 1 } = {}) {
  speechPrefs.voiceName = voiceName;
  speechPrefs.speechRate = speechRate;
}

// The English voices on this device, for the Settings picker
export const englishVoices = () =>
  ttsSupported ? window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('en')) : [];

// Prefer an Indian English voice, then British, then any English
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = [
    (v) => v.lang === 'en-IN' && /google/i.test(v.name),
    (v) => v.lang === 'en-IN',
    (v) => v.lang === 'en-GB' && /google/i.test(v.name),
    (v) => v.lang?.startsWith('en-GB'),
    (v) => v.lang?.startsWith('en'),
  ];
  for (const p of prefs) {
    const v = voices.find(p);
    if (v) return v;
  }
  return voices[0];
}

if (ttsSupported) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = pickVoice();
  });
}

export const RATE = { friendly: 0.85, neutral: 0.95, tough: 1.05 };

export function speak(text, { rate = 0.95, onStart, onEnd } = {}) {
  if (!ttsSupported || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // The chosen voice if this device has it, otherwise the usual preference order
  const chosen = speechPrefs.voiceName && window.speechSynthesis.getVoices().find((v) => v.name === speechPrefs.voiceName);
  const voice = chosen || cachedVoice || pickVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'en-IN';
  }
  // Each caller's rate (slower for single words, faster at Tough) scaled by the person's own speed
  u.rate = Math.min(2, Math.max(0.5, rate * speechPrefs.speechRate));
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.(); // includes being interrupted by cancel()
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel();
}