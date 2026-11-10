// WCAG contrast check for the design tokens.
//   npm run contrast              -> table for palette A (the default) and B, exits 1 on any failure
// Reads src/styles/tokens.css (primitives per palette + the semantic map) and scripts/contrast-pairs.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TOKENS_FILE = join(HERE, '..', 'src', 'styles', 'tokens.css');
export const PALETTES = ['a', 'b'];

const channel = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

// Colour-blind simulation (Machado et al. 2009, full severity) and CIE76 distance
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export function simulate(hex, kind) {
  const l = rgb(hex).map(channel);
  return CVD[kind].map((row) => Math.min(1, Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2])));
}
export function deltaE(linA, linB) {
  const lab = ([r, g, b]) => {
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(linA), lab(linB)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// Primitives live in `:root` (palette A) and `:root[data-palette="b"]` (palette B, overrides A);
// the semantic --color-* names in `@theme inline` point at them with var().
export function loadTokens(palette = 'a', css = readFileSync(TOKENS_FILE, 'utf8')) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const block = (selector) => {
    const i = text.indexOf(selector + ' {');
    if (i < 0) return {};
    const body = text.slice(i, text.indexOf('}', i));
    return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  };
  const prims = { ...block(':root'), ...(palette === 'b' ? block(':root[data-palette="b"]') : {}) };
  const out = {};
  for (const [name, value] of Object.entries(block('@theme inline'))) {
    if (!name.startsWith('color-')) continue;
    out[name.slice(6)] = value.replace(/var\(--([\w-]+)\)/g, (_, p) => prims[p] ?? `MISSING(${p})`);
  }
  return out;
}

export function checkPairs(tokens, pairs) {
  return pairs.map(({ fg, bg, min, use }) => {
    const ratio = /^#[0-9a-f]{6}$/i.test(tokens[fg] ?? '') && /^#[0-9a-f]{6}$/i.test(tokens[bg] ?? '') ? contrast(tokens[fg], tokens[bg]) : 0;
    return { fg, bg, min, use, ratio, pass: ratio >= min };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pairs = JSON.parse(readFileSync(join(HERE, 'contrast-pairs.json'), 'utf8')).pairs;
  let failed = 0;
  for (const palette of PALETTES) {
    const rows = checkPairs(loadTokens(palette), pairs);
    console.log(`\nPalette ${palette.toUpperCase()}${palette === 'a' ? ' (default)' : ''}`);
    console.table(rows.map((r) => ({ foreground: r.fg, background: r.bg, ratio: r.ratio, needs: r.min, result: r.pass ? 'pass' : 'FAIL', use: r.use })));
    failed += rows.filter((r) => !r.pass).length;
  }
  console.log(failed ? `\n${failed} pair(s) fail` : '\nAll pairs pass');
  process.exit(failed ? 1 : 0);
}
