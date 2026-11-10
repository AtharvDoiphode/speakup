// Design-token checks. Run with: npm run test:tokens
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { contrast, loadTokens, checkPairs, simulate, deltaE, PALETTES } from './check-contrast.mjs';

const CLIENT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(CLIENT, 'src');

const REQUIRED = [
  'surface-canvas', 'surface-card', 'surface-sunken', 'surface-overlay', 'surface-inverse', 'border-subtle', 'border-strong',
  'text-primary', 'text-secondary', 'text-muted', 'text-inverse', 'text-link',
  'brand', 'brand-50', 'brand-100', 'brand-500', 'brand-600', 'brand-700', 'on-brand',
  'mistake', 'mistake-tint', 'mistake-text', 'success', 'success-tint', 'success-text',
  'warning', 'warning-tint', 'warning-text', 'marker', 'marker-tint', 'marker-text', 'info', 'info-tint', 'info-text',
  'focus-ring', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6',
];

test('contrast() matches known WCAG values', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21);
  assert.equal(contrast('#FFFFFF', '#FFFFFF'), 1);
  assert.ok(Math.abs(contrast('#777777', '#FFFFFF') - 4.48) < 0.01);
  const [row] = checkPairs({ a: '#777777', b: '#FFFFFF' }, [{ fg: 'a', bg: 'b', min: 4.5 }]);
  assert.equal(row.pass, false, 'a known failing pair fails');
});

for (const palette of PALETTES) {
  test(`palette ${palette}: every token is defined`, () => {
    const t = loadTokens(palette);
    for (const name of REQUIRED) assert.ok(t[name], `--color-${name} missing in palette ${palette}`);
    for (const name of REQUIRED.filter((n) => n !== 'surface-overlay')) assert.match(t[name], /^#[0-9A-F]{6}$/i, `${name} resolves to a hex colour`);
  });

  test(`palette ${palette}: every pair in contrast-pairs.json passes`, () => {
    const pairs = JSON.parse(readFileSync(join(CLIENT, 'scripts', 'contrast-pairs.json'), 'utf8')).pairs;
    const failing = checkPairs(loadTokens(palette), pairs).filter((r) => !r.pass);
    assert.deepEqual(failing.map((r) => `${r.fg} on ${r.bg}: ${r.ratio} < ${r.min}`), []);
  });

  test(`palette ${palette}: 6 chart colours, distinct in colour, greyscale and colour-blind views`, () => {
    const t = loadTokens(palette);
    const c = [1, 2, 3, 4, 5, 6].map((i) => t[`chart-${i}`]);
    assert.equal(new Set(c.map((x) => x.toUpperCase())).size, 6);
    for (const x of c) assert.ok(contrast(x, t['surface-card']) >= 3, `${x} is 3:1 on cards`);
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      assert.ok(contrast(c[i], c[j]) >= 1.25, `${c[i]} / ${c[j]} differ in greyscale`);
      for (const kind of ['protan', 'deutan', 'tritan']) assert.ok(deltaE(simulate(c[i], kind), simulate(c[j], kind)) >= 10, `${c[i]} / ${c[j]} differ for ${kind}`);
    }
  });
}

// Raw colours are allowed only in the files listed in scripts/color-lint-allow.json
const ALLOW = JSON.parse(readFileSync(join(CLIENT, 'scripts', 'color-lint-allow.json'), 'utf8')).files;
const RULES = [
  ['raw hex', /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi],
  ['rgb/hsl/lab function', /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/gi],
  ['Tailwind palette class', /\b(?:bg|text|border(?:-[trblxy])?|ring|fill|stroke|outline|decoration|accent|caret|divide|from|via|to|placeholder|shadow)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/g],
];
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

test('no raw colours or palette classes in client/src outside the token file', () => {
  const hits = [];
  for (const file of walk(SRC).filter((f) => ['.js', '.jsx', '.css'].includes(extname(f)))) {
    const rel = relative(CLIENT, file).replace(/\\/g, '/');
    if (ALLOW.includes(rel)) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const [what, re] of RULES) for (const m of line.matchAll(re)) hits.push(`${rel}:${i + 1} ${what}: ${m[0]}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('the production build succeeds', () => {
  execFileSync(process.execPath, [join(CLIENT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--logLevel', 'error'], { cwd: CLIENT, stdio: 'pipe' });
});
