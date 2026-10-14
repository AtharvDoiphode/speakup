export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let cachedVoice = null;

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
  const voice = cachedVoice ?? pickVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'en-IN';
  }
  u.rate = rate;
  u.onstart = () => onStart?.();
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.(); // includes being interrupted by cancel()
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel();
}