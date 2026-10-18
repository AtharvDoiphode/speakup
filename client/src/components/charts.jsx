import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChartBarIcon, TableIcon } from '@phosphor-icons/react';
import { useWidth, niceMax, tickIndexes } from '../lib/chartMath';

// Hand-written SVG charts (no chart library). Each SVG's viewBox matches its real pixel
// width, measured with a ResizeObserver, so text and lines stay crisp from 390px to 1440px.

const ease = [0.2, 0.8, 0.2, 1];
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * The frame every chart sits in: title, an optional note, "View as table", and an empty state.
 *  - table: { columns: [..], rows: [[..], ..] } — the same numbers as the chart
 */
export function ChartCard({ title, note, table, empty, children, className = '' }) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-surface p-5 md:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
          {note && <p className="text-[13px] text-ink-soft">{note}</p>}
        </div>
        {!empty && table && (
          <button type="button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}
            className="flex h-8 items-center gap-1.5 rounded-[9px] border border-line px-2.5 text-[13px] font-medium text-ink-soft hover:text-ink">
            {asTable ? <ChartBarIcon size={14} /> : <TableIcon size={14} />} {asTable ? 'View as chart' : 'View as table'}
          </button>
        )}
      </div>
      {empty ? (
        <div className="flex min-h-32 flex-col items-start justify-center gap-1.5 text-[15px] text-ink-soft">{empty}</div>
      ) : asTable ? (
        <div className="max-h-80 overflow-auto rounded-field border border-line">
          <table className="w-full text-left text-[13px] tabular-nums">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-canvas">
              <tr>{table.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((v, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-1.5 font-medium">{v}</th> : <td key={j} className="px-3 py-1.5">{v}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// Which point is picked: by hover, tap, or the arrow keys when the chart has focus
function usePick(n) {
  const [pick, setPick] = useState(null);
  const onKeyDown = (e) => {
    if (!n) return;
    const keys = { ArrowRight: 1, ArrowLeft: -1 };
    if (e.key in keys) { e.preventDefault(); setPick((p) => clamp((p ?? (keys[e.key] > 0 ? -1 : n)) + keys[e.key], 0, n - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setPick(0); }
    else if (e.key === 'End') { e.preventDefault(); setPick(n - 1); }
    else if (e.key === 'Escape') setPick(null);
  };
  return [pick, setPick, onKeyDown];
}

function Readout({ id, text, hint }) {
  return (
    <p id={id} aria-live="polite" className={`min-h-5 text-[13px] ${text ? 'font-medium text-ink' : 'text-ink-faint'}`}>
      {text || hint}
    </p>
  );
}

const PAD = { l: 34, r: 10, t: 14, b: 26 };

/**
 * Vertical bars, one per point. points: [{ key, label, tick, value, highlight }]
 *  - goal: a dashed line with a label, at that value
 *  - readout(point) → the text shown for the picked bar
 */
export function BarChart({ points, height = 200, goal, readout, summary, unit = '' }) {
  const [ref, W] = useWidth();
  const [pick, setPick, onKeyDown] = usePick(points.length);
  const rid = useId();
  const w = Math.max(W, 260);
  const n = points.length;
  const max = niceMax(Math.max(1, goal ?? 0, ...points.map((p) => p.value)));
  const iw = w - PAD.l - PAD.r, ih = height - PAD.t - PAD.b;
  const step = iw / n;
  const bw = Math.max(1.5, Math.min(28, step * 0.66));
  const y = (v) => PAD.t + ih - (v / max) * ih;
  const ticks = tickIndexes(n, w < 520 ? 4 : n <= 7 ? 7 : 6);
  const at = (clientX, el) => clamp(Math.floor((clientX - el.getBoundingClientRect().left - PAD.l) / step), 0, n - 1);

  return (
    <div ref={ref} className="flex min-w-0 flex-col gap-1">
      <Readout id={rid} text={pick != null ? readout(points[pick]) : ''} hint="Hover, tap or use the arrow keys for a day's numbers" />
      {W > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={summary} aria-describedby={rid}
          tabIndex={0} onKeyDown={onKeyDown} className="block max-w-full touch-pan-y select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onPointerMove={(e) => e.pointerType === 'mouse' && setPick(at(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setPick(at(e.clientX, e.currentTarget))}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setPick(null)}>
          <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="fill-ink-faint text-[12px]">{max}{unit}</text>
          <text x={PAD.l - 6} y={PAD.t + ih} textAnchor="end" className="fill-ink-faint text-[12px]">0</text>
          <line x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih + 0.5} y2={PAD.t + ih + 0.5} className="stroke-line" />
          {pick != null && <rect x={PAD.l + pick * step} y={PAD.t} width={step} height={ih} className="fill-marker/35" />}
          {points.map((p, i) => {
            const h = (p.value / max) * ih;
            return p.value > 0 ? (
              // Real y and height, so the bar is always drawn where it belongs. It grows in with
              // a CSS animation (.bar-grow in index.css), which reduced motion and print switch off.
              <rect key={p.key} x={PAD.l + i * step + (step - bw) / 2} y={y(p.value)} width={bw} height={h} rx={Math.min(3, bw / 2)}
                className={`bar-grow ${p.highlight ? 'fill-brand' : 'fill-brand/45'}`} data-value={p.value}
                style={{ animationDelay: `${Math.min(i * 4, 100)}ms` }} />
            ) : null;
          })}
          {goal != null && goal > 0 && (
            <g>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(goal)} y2={y(goal)} strokeDasharray="5 4" className="stroke-ink-soft" strokeWidth="1.25" />
              <text x={w - PAD.r} y={y(goal) - 5} textAnchor="end" className="fill-ink-soft text-[12px] font-medium">Goal {goal}{unit}</text>
            </g>
          )}
          {ticks.map((i) => (
            <text key={i} x={PAD.l + i * step + step / 2} y={height - 6} textAnchor={i === 0 && n > 7 ? 'start' : i === n - 1 && n > 7 ? 'end' : 'middle'}
              className={`text-[12px] ${points[i].highlight ? 'fill-ink font-semibold' : 'fill-ink-faint'}`}>{points[i].tick}</text>
          ))}
        </svg>
      )}
    </div>
  );
}

/**
 * A line through points: [{ key, label, tick, value | null }]. A null breaks the line,
 * so a quiet day is a gap, not a drop to zero. A point with no neighbours is a dot.
 *  - domain: [min, max] for the y axis, or omitted to fit the data
 */
export function LineChart({ points, height = 180, domain, readout, summary, unit = '' }) {
  const reduce = useReducedMotion();
  const [ref, W] = useWidth();
  const [pick, setPick, onKeyDown] = usePick(points.length);
  const rid = useId();
  const w = Math.max(W, 260);
  const n = points.length;
  const values = points.map((p) => p.value).filter((v) => v != null);
  const [lo, hi] = domain ?? [0, niceMax(Math.max(1, ...values))];
  const iw = w - PAD.l - PAD.r, ih = height - PAD.t - PAD.b;
  const x = (i) => PAD.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = tickIndexes(n, w < 520 ? 4 : n <= 7 ? 7 : 6);

  // Split into runs of days that have a value
  const runs = [];
  let cur = [];
  points.forEach((p, i) => {
    if (p.value == null) { if (cur.length) runs.push(cur); cur = []; }
    else cur.push(i);
  });
  if (cur.length) runs.push(cur);
  const dots = n <= 31;

  const at = (clientX, el) => {
    const px = clientX - el.getBoundingClientRect().left;
    return clamp(Math.round(n === 1 ? 0 : ((px - PAD.l) / iw) * (n - 1)), 0, n - 1);
  };

  return (
    <div ref={ref} className="flex min-w-0 flex-col gap-1">
      <Readout id={rid} text={pick != null ? readout(points[pick]) : ''} hint="Hover, tap or use the arrow keys for the exact numbers" />
      {W > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={summary} aria-describedby={rid}
          tabIndex={0} onKeyDown={onKeyDown} className="block max-w-full touch-pan-y select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          onPointerMove={(e) => e.pointerType === 'mouse' && setPick(at(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setPick(at(e.clientX, e.currentTarget))}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setPick(null)}>
          <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="fill-ink-faint text-[12px]">{hi}{unit}</text>
          <text x={PAD.l - 6} y={PAD.t + ih} textAnchor="end" className="fill-ink-faint text-[12px]">{lo}</text>
          <line x1={PAD.l} x2={w - PAD.r} y1={PAD.t + ih + 0.5} y2={PAD.t + ih + 0.5} className="stroke-line" />
          {pick != null && <line x1={x(pick)} x2={x(pick)} y1={PAD.t} y2={PAD.t + ih} className="stroke-marker" strokeWidth="6" strokeLinecap="round" opacity="0.6" />}
          {runs.filter((r) => r.length > 1).map((r) => (
            <motion.path key={r[0]} d={r.map((i, k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)},${y(points[i].value).toFixed(1)}`).join(' ')}
              fill="none" className="stroke-brand" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" data-run={r.length}
              // A fade, not a draw-on: a resize mid-draw can never leave half a line
              initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease }} />
          ))}
          {points.map((p, i) => {
            if (p.value == null) return null;
            const alone = runs.some((r) => r.length === 1 && r[0] === i);
            if (!dots && !alone && pick !== i) return null;
            return <circle key={p.key} cx={x(i)} cy={y(p.value)} r={pick === i ? 4.5 : 3} className={pick === i ? 'fill-ink' : 'fill-brand'} data-alone={alone || undefined} />;
          })}
          {ticks.map((i) => (
            // The first and last labels sit inside the chart so they're never cut off
            <text key={i} x={x(i)} y={height - 6} textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-ink-faint text-[12px]">{points[i].tick}</text>
          ))}
        </svg>
      )}
    </div>
  );
}
