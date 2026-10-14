import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceSupported = !!Recognition;

const ERRORS = {
  'not-allowed': 'Microphone is blocked. Allow it from the icon in the address bar, or type instead.',
  'service-not-allowed': 'Microphone is blocked. Allow it from the icon in the address bar, or type instead.',
  'audio-capture': 'No microphone found. Plug one in, or type instead.',
  'no-speech': "I didn't hear anything. Try again a little closer to the mic.",
  network: 'Voice needs an internet connection. Check it, or type instead.',
};

// Speech-to-text plus a live mic level for the orb (window.__speakupVolume).
// onAutoEnd(text) fires when the browser ends listening by itself (long silence),
// so nothing you said is lost.
export function useVoiceInput({ lang = 'en-IN', onAutoEnd } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const recRef = useRef(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const resolveRef = useRef(null);
  const activeRef = useRef(false);
  const audioRef = useRef(null);
  const autoEndRef = useRef(onAutoEnd);
  // Keep the latest callback, updated after each render (refs shouldn't change during render)
  useEffect(() => {
    autoEndRef.current = onAutoEnd;
  });

  const stopLevel = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      cancelAnimationFrame(a.raf);
      a.stream.getTracks().forEach((t) => t.stop());
      a.ctx.close();
      audioRef.current = null;
    }
    window.__speakupVolume = undefined;
  }, []);

  const startLevel = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop()); // stopped while we were waiting
        return;
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const a = { stream, ctx, raf: 0 };
      audioRef.current = a;
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const b of buf) {
          const v = (b - 128) / 128;
          sum += v * v;
        }
        window.__speakupVolume = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        a.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // The level only animates the orb; permission errors are reported by recognition.
    }
  }, []);

  const start = useCallback(() => {
    if (!Recognition || recRef.current) return;
    setError('');
    setTranscript('');
    setInterim('');
    finalRef.current = '';
    interimRef.current = '';

    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let fin = '';
      let int = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else int += r[0].transcript;
      }
      finalRef.current = fin;
      interimRef.current = int;
      setTranscript(fin);
      setInterim(int);
    };

    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'Voice input stopped. Try again, or type instead.');
    };

    rec.onend = () => {
      recRef.current = null;
      activeRef.current = false;
      setListening(false);
      stopLevel();
      const text = `${finalRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim();
      if (resolveRef.current) {
        resolveRef.current(text);
        resolveRef.current = null;
      } else {
        autoEndRef.current?.(text);
      }
    };

    recRef.current = rec;
    activeRef.current = true;
    rec.start();
    setListening(true);
    startLevel();
  }, [lang, startLevel, stopLevel]);

  // Stop listening and get what was said.
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        if (!recRef.current) return resolve(`${finalRef.current} ${interimRef.current}`.trim());
        resolveRef.current = resolve;
        recRef.current.stop();
      }),
    []
  );

  // Stop and throw it away.
  const cancel = useCallback(() => {
    resolveRef.current = () => {};
    recRef.current?.abort();
  }, []);

  useEffect(
    () => () => {
      resolveRef.current = () => {};
      recRef.current?.abort();
      stopLevel();
    },
    [stopLevel]
  );

  return {
    supported: voiceSupported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    cancel,
    clearError: () => setError(''),
  };
}