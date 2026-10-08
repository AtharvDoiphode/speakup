import { useEffect, useRef } from 'react';

// Three stacked blobs: blue outside, pink inside it, a yellow core
const LAYERS = [
  { rgb: '47, 60, 255', alpha: 1, phase: 0, size: 1, depth: 1 },
  { rgb: '255, 61, 127', alpha: 0.92, phase: 2.1, size: 0.8, depth: 0.6 },
  { rgb: '255, 210, 63', alpha: 0.96, phase: 4.2, size: 0.52, depth: 0.3 },
];

const POINTS = 96; // more points = smoother outline
const SPEED = { idle: 1, listening: 1.5, speaking: 1.9, thinking: 3.2 };

/**
 * props:
 *  - levelRef: a React ref whose .current is loudness (0 to 1). We read it
 *    every frame, so updating it never re-renders React.
 *  - state: 'idle' | 'listening' | 'speaking' | 'thinking'
 */
export default function VoiceOrb({ levelRef, state = 'idle' }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(state);

  // Keep the latest state available to the animation loop without restarting it
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let t = 3; // animation time
    let smooth = 0; // smoothed loudness
    let sizeNow = 1; // shrinks a little while "thinking"
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // Draws one frame using the current values above
    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const amp = 0.05 + smooth * 0.24;

      LAYERS.forEach((layer, index) => {
        const base = Math.min(w, h) * 0.3 * sizeNow * layer.size;
        // Inner layers drift around slowly, so the colors never sit as a bullseye
        const drift = base * 0.16 * index;
        const cx = w / 2 + pointer.x * 22 * layer.depth + Math.cos(t * 0.7 + layer.phase) * drift;
        const cy = h / 2 + pointer.y * 22 * layer.depth + Math.sin(t * 0.9 + layer.phase) * drift;

        // Build the outline: a circle whose radius wobbles with sine waves
        const pts = [];
        for (let i = 0; i < POINTS; i++) {
          const a = (i / POINTS) * Math.PI * 2;
          const wave =
            Math.sin(a * 3 + t * 1.1 + layer.phase) * 0.5 +
            Math.sin(a * 5 - t * 0.8 + layer.phase * 1.7) * 0.3 +
            Math.sin(a * 2 + t * 0.6 + layer.phase * 0.7) * 0.4;
          const r = base * (1 + amp * wave);
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }

        // Draw a smooth closed curve through the points
        ctx.beginPath();
        for (let i = 0; i < POINTS; i++) {
          const p = pts[i];
          const q = pts[(i + 1) % POINTS];
          if (i === 0) {
            const last = pts[POINTS - 1];
            ctx.moveTo((last.x + p.x) / 2, (last.y + p.y) / 2);
          }
          ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
        }
        ctx.closePath();

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${layer.rgb}, ${layer.alpha})`;
        if (index === 0) {
          ctx.shadowColor = 'rgba(47, 60, 255, 0.35)';
          ctx.shadowBlur = 50 * dpr; // shadow size ignores the canvas scale
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    };

    // Match the canvas to its parent's size, sharp on high-DPI screens
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) render(); // static picture, no animation loop
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement);
    resize();

    // The orb leans slightly toward the cursor
    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const state = stateRef.current;

      t += dt * (SPEED[state] ?? 1);

      // Where should the loudness be heading?
      let target = levelRef?.current ?? 0;
      if (state === 'speaking') {
        // Fake a speech rhythm for the AI's voice
        target = 0.3 + 0.3 * Math.abs(Math.sin(t * 3.3) * Math.sin(t * 1.3 + 1));
      }
      smooth += (target - smooth) * Math.min(1, dt * 9);
      sizeNow += ((state === 'thinking' ? 0.88 : 1) - sizeNow) * Math.min(1, dt * 6);
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 4);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 4);

      render();
      raf = requestAnimationFrame(tick);
    };

    if (!reduceMotion) {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(tick);
    }

    // Stop everything when the orb leaves the page
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      observer.disconnect();
    };
  }, [levelRef]);

  // Decorative only, so screen readers skip it
  return <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />;
}
