import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const voiceSupported = !!Recognition;

const ERRORS = {
  'not-allowed': 'Microphone is blocked. Allow it from the icon in the address bar, or type instead.',
  'service-not-allowed': 'Microphone is blocked. Allow it from the icon in the address bar, or type instead.',
  'audio-capture': 'No microphone found. Plug one in, or type instead.',
  network: 'Voice needs an internet connection. Check it, or type instead.',
};

// Chrome stops listening by itself after a stretch of silence. We quietly start
// again and keep your words, so a pause to think never sends half a sentence.
// Only after this many silent restarts in a row (roughly 15+ seconds of nothing)
// do we give up, and never after more than MAX_LISTEN_MS in total.
const MAX_SILENT_RESTARTS = 2;
const MAX_LISTEN_MS = 2 * 60_000;
// If the browser never says "the mic is open", stop showing "Getting ready…" after this
const READY_FALLBACK_MS = 1500;

const tidy = (s) => s.replace(/\s+/g, ' ').trim();

// Speech-to-text plus a live mic level for the orb (window.__speakupVolume).
// onAutoEnd(text) fires only if listening has to end without a tap (long silence,
// a lost connection), so nothing you said is lost.
export function useVoiceInput({ lang = 'en-IN', onAutoEnd } = {}) {
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false); // false until the mic is really capturing
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const recRef = useRef(null); // the current recognition session
  const activeRef = useRef(false); // true from start() until listening is fully over
  const carryRef = useRef(''); // words from earlier sessions (before a restart)
  const finalRef = useRef(''); // settled words in this session
  const interimRef = useRef(''); // words still being guessed in this session
  const resolveRef = useRef(null); // set by stop(): who is waiting for the text
  const fatalRef = useRef(false); // an error that a restart won't fix
  const silentRunsRef = useRef(0);
  const startedAtRef = useRef(0);
  const readyTimerRef = useRef(0);
  const audioRef = useRef(null);
  // A session restarts itself through this ref (a callback can't name itself while it's being created)
  const restartRef = useRef(null);
  const autoEndRef = useRef(onAutoEnd);
  // Keep the latest callback, updated after each render (refs shouldn't change during render)
  useEffect(() => {
    autoEndRef.current = onAutoEnd;
  });

  const allText = () => tidy(`${carryRef.current} ${finalRef.current} ${interimRef.current}`);

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
      // This second stream only measures loudness for the orb. All of Chrome's audio
      // processing is switched off on it: with auto gain on, Chrome can change the
      // microphone's level in Windows itself, which makes speech recognition worse.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: false, noiseSuppression: false, echoCancellation: false },
      });
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

  // Switch everything off. Called once, however listening ends.
  const finish = useCallback(() => {
    recRef.current = null;
    activeRef.current = false;
    clearTimeout(readyTimerRef.current);
    setListening(false);
    setReady(false);
    stopLevel();
  }, [stopLevel]);

  const markReady = useCallback(() => {
    clearTimeout(readyTimerRef.current);
    setReady(true);
  }, []);

  // One recognition session. Chrome ends sessions by itself; onend decides
  // whether that was you (stop), a cancel, an error, or silence (start again).
  const startSession = useCallback(() => {
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    finalRef.current = '';
    interimRef.current = '';

    rec.onaudiostart = markReady; // the mic is really capturing now

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
      const settled = tidy(`${carryRef.current} ${fin}`);
      setTranscript(settled);
      // The page shows settled words then in-progress words side by side. After a restart
      // Chrome's words come without a leading space, so add one: "working here", not "workinghere"
      setInterim(settled && int && !/^\s/.test(int) ? ` ${int}` : int);
    };

    rec.onerror = (e) => {
      // "no-speech" is just silence: the restart below handles it
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      fatalRef.current = true;
      setError(ERRORS[e.error] ?? 'Voice input stopped. Try again, or type instead.');
    };

    rec.onend = () => {
      if (recRef.current !== rec) return; // an old session finishing late
      const said = tidy(`${finalRef.current} ${interimRef.current}`);
      const text = allText();

      if (resolveRef.current) {
        // You tapped to stop: hand over everything you said
        const resolve = resolveRef.current;
        resolveRef.current = null;
        finish();
        resolve(text);
        return;
      }
      if (!activeRef.current) {
        finish(); // cancelled
        return;
      }
      if (fatalRef.current) {
        finish();
        if (text) autoEndRef.current?.(text); // keep anything said before the error
        return;
      }

      // The browser stopped by itself. Keep listening, unless it has been silent for a long while.
      silentRunsRef.current = said ? 0 : silentRunsRef.current + 1;
      const tooLong = Date.now() - startedAtRef.current > MAX_LISTEN_MS;
      if (silentRunsRef.current > MAX_SILENT_RESTARTS || tooLong) {
        finish();
        autoEndRef.current?.(text);
        return;
      }
      carryRef.current = text;
      try {
        restartRef.current(); // a new session; your words so far are kept in carryRef
      } catch {
        finish();
        autoEndRef.current?.(text);
      }
    };

    recRef.current = rec;
    rec.start();
  }, [lang, markReady, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    restartRef.current = startSession;
  }, [startSession]);

  const start = useCallback(() => {
    if (!Recognition || activeRef.current) return;
    setError('');
    setTranscript('');
    setInterim('');
    carryRef.current = '';
    resolveRef.current = null;
    fatalRef.current = false;
    silentRunsRef.current = 0;
    startedAtRef.current = Date.now();
    activeRef.current = true;
    setListening(true);
    setReady(false);
    // Show "Getting ready…" until the mic is really on, but never for ever
    readyTimerRef.current = setTimeout(markReady, READY_FALLBACK_MS);
    try {
      startSession();
    } catch {
      finish();
      setError('Voice input could not start. Try again, or type instead.');
      return;
    }
    startLevel();
  }, [startSession, startLevel, markReady, finish]);

  // Stop listening and get everything that was said.
  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        if (!activeRef.current || !recRef.current) {
          const text = allText();
          if (activeRef.current) finish();
          return resolve(text);
        }
        resolveRef.current = resolve;
        recRef.current.stop();
      }),
    [finish] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Stop and throw it away.
  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    resolveRef.current = null;
    if (recRef.current) recRef.current.abort();
    else finish();
  }, [finish]);

  useEffect(
    () => () => {
      activeRef.current = false;
      resolveRef.current = null;
      recRef.current?.abort();
      clearTimeout(readyTimerRef.current);
      stopLevel();
    },
    [stopLevel]
  );

  return {
    supported: voiceSupported,
    listening,
    ready,
    transcript,
    interim,
    error,
    start,
    stop,
    cancel,
    clearError: () => setError(''),
  };
}
