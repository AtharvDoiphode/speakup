// Motion-token checks. Run with: npm run test:motion
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../src/lib/motion.js';

const CLIENT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(CLIENT, 'src');
const TRANSFORM_KEYS = ['x', 'y', 'z', 'scale', 'scaleX', 'scaleY', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'skew', 'skewX', 'skewY', 'translateX', 'translateY'];
const LAYOUT_KEYS = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'boxShadow'];
const VARIANTS = ['fade', 'fadeUp', 'scaleIn', 'slideIn', 'sheet', 'drawer', 'page', 'backdrop'];
const states = (v) => ['hidden', 'show', 'exit'].map((k) => (typeof v[k] === 'function' ? v[k](0.1) : v[k]));

test('durations are tokens between 0.1s and 0.6s', () => {
  assert.deepEqual(Object.keys(M.DURATION), ['instant', 'fast', 'base', 'slow', 'chart']);
  for (const [k, d] of Object.entries(M.DURATION)) assert.ok(d >= 0.1 && d <= 0.6, `${k} = ${d}`);
});

test('every exit is faster than its enter (about 65%)', () => {
  for (const k of Object.keys(M.DURATION)) {
    const e = M.enter(k).duration, x = M.exit(k).duration;
    assert.ok(x < e, `${k}: exit ${x} < enter ${e}`);
    assert.ok(Math.abs(x / e - 0.65) < 0.02, `${k}: ratio ${x / e}`);
  }
  for (const name of VARIANTS) {
    const [, show, out] = states(M[name]);
    assert.ok(out.transition.duration < show.transition.duration, `${name} exit is faster`);
  }
});

test('easings are cubic-bezier curves, not the default ease', () => {
  for (const [k, e] of Object.entries(M.EASE)) {
    assert.equal(e.length, 4, k);
    assert.ok(e[0] >= 0 && e[0] <= 1 && e[2] >= 0 && e[2] <= 1, `${k} x values in 0..1`);
  }
  assert.equal(M.enter('base').ease, M.EASE.out);
  assert.equal(M.exit('base').ease, M.EASE.in);
});

test('springs settle without a heavy bounce (damping ratio at least 0.85)', () => {
  for (const [k, s] of Object.entries(M.SPRING)) {
    const ratio = s.damping / (2 * Math.sqrt(s.stiffness * (s.mass ?? 1)));
    assert.ok(ratio >= 0.85, `${k} damping ratio ${ratio.toFixed(2)}`);
  }
});

test('stagger(n) is 30ms per item and never more than 300ms', () => {
  assert.equal(M.stagger(0), 0);
  assert.equal(M.stagger(1), 0.03);
  assert.equal(M.stagger(5), 0.15);
  for (let n = 0; n < 5000; n++) assert.ok(M.stagger(n) <= 0.3, `stagger(${n})`);
  assert.deepEqual(M.listItem(11).custom <= 0.3, true);
  assert.deepEqual(M.listItem(12), {}, 'item 13 onwards does not animate');
});

test('variants are valid motion objects', () => {
  for (const name of VARIANTS) {
    const v = M[name];
    for (const s of states(v)) {
      assert.equal(typeof s, 'object', name);
      for (const [k, val] of Object.entries(s)) {
        if (k === 'transition' || k === 'pointerEvents') continue;
        assert.ok(typeof val === 'number' || typeof val === 'string', `${name}.${k} is a value`);
        assert.ok(!LAYOUT_KEYS.includes(k), `${name} animates ${k}`);
      }
    }
  }
});

test('a variant that leaves stops taking clicks, and one that comes back takes them again', () => {
  for (const name of VARIANTS) {
    const [, show, out] = states(M[name]);
    assert.equal(out.pointerEvents, 'none', `${name} exit`);
    assert.equal(show.pointerEvents, 'auto', `${name} show (an exit interrupted by a quick return must not leave it dead)`);
  }
});

test('reduced-motion variants have no transform and fade in 0.1s or less', () => {
  for (const name of VARIANTS) {
    for (const s of states(M.reduce(M[name]))) {
      for (const k of Object.keys(s)) assert.ok(!TRANSFORM_KEYS.includes(k), `reduced ${name} moves ${k}`);
      if (s.transition) assert.ok(s.transition.duration <= 0.1, `reduced ${name} lasts ${s.transition.duration}`);
    }
  }
  assert.deepEqual(M.reduce(M.fadeUp).hidden, { opacity: 0 });
});

test('CSS custom properties come from the tokens', () => {
  const vars = M.cssVars();
  assert.equal(vars['--motion-base'], '0.22s');
  assert.match(vars['--motion-ease-out'], /^cubic-bezier\(/);
});

// No component defines its own timing. Exceptions live in scripts/motion-lint-allow.json.
const ALLOW = JSON.parse(readFileSync(join(CLIENT, 'scripts', 'motion-lint-allow.json'), 'utf8'));
const RULES = [
  ['hard-coded duration', /\bduration\s*:/g],
  ['hard-coded delay', /\bdelay\s*:\s*[\d.]/g],
  ['hard-coded easing', /\bease\s*:\s*[[\d'"]/g],
  ['hard-coded spring', /\b(stiffness|damping|bounce)\s*:/g],
  ['hard-coded cubic-bezier array', /\[\s*-?\d*\.\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.\d+\s*,\s*-?\d*\.?\d+\s*\]/g],
  ['hard-coded loop', /\brepeat(Delay)?\s*:/g],
  ['inline CSS transition or animation', /\b(?:transition|animation)(?:Duration|Delay)?\s*:\s*['"`]/g],
  ['arbitrary Tailwind timing class', /(?<![\w-])(?:duration|delay|ease|animate)-\[/g],
  ['Tailwind duration/ease class', /(?<![\w-])(duration|ease|delay)-(?:\d+|in|out|in-out|linear)(?![\w-])/g],
  ['transition: all', /transition(?:-all|\s*:\s*all)\b/g],
  ['animated layout property', /(?:initial|animate|exit|whileHover|whileTap)=\{\{[^}]*\b(?:width|height|top|left|margin\w*|flexGrow)\s*:/g],
  ['CSS time value', /(?<![\w-])\d*\.?\d+m?s(?![\w-])(?=[^{]*;)/g],
];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

test('no hard-coded motion timing, transition: all or animated layout properties outside motion.js', () => {
  const hits = [];
  for (const file of walk(SRC).filter((f) => ['.js', '.jsx', '.css'].includes(extname(f)))) {
    const rel = relative(CLIENT, file).replace(/\\/g, '/');
    if (ALLOW.files.includes(rel)) continue;
    const css = rel.endsWith('.css');
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if ((ALLOW.lines[rel] ?? []).some((s) => line.includes(s))) return;
      for (const [what, re] of RULES) {
        if ((what === 'CSS time value') !== css) continue;
        for (const m of line.matchAll(re)) hits.push(`${rel}:${i + 1} ${what}: ${m[0]}`);
      }
    });
  }
  if (hits.length) console.log(hits.join('\n'));
  assert.equal(hits.length, 0, `${hits.length} hard-coded motion value(s), listed above`);
});
