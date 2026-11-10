// Brand asset checks. Run with: npm run test:brand
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { COLORS as C } from './brand-colors.mjs';

const CLIENT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(CLIENT, 'public');
const ROOT = join(CLIENT, '..');
const read = (p) => readFileSync(p, 'utf8');

const BRAND_SVGS = ['logo-mark.svg', 'logo-horizontal.svg', 'logo-horizontal-dark.svg', 'logo-stacked.svg', 'logo-mono.svg'].map((f) => join(PUB, 'brand', f));
const CONCEPTS = readdirSync(join(ROOT, 'design', 'logo-options')).filter((f) => f.endsWith('.svg')).map((f) => join(ROOT, 'design', 'logo-options', f));
const ALL_SVGS = [join(PUB, 'favicon.svg'), ...BRAND_SVGS, ...CONCEPTS];

// Minimal well-formedness check: every tag closes in order, attributes are quoted
function assertWellFormed(xml, name) {
  assert.match(xml, /^<svg[\s>]/, `${name}: starts with <svg>`);
  const stack = [];
  for (const [, close, tag, attrs, self] of xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    assert.doesNotMatch(attrs, /\s[\w:-]+=(?!["'])/, `${name}: unquoted attribute on <${tag}>`);
    if (close) assert.equal(stack.pop(), tag, `${name}: </${tag}> closes the wrong element`);
    else if (!self) stack.push(tag);
  }
  assert.deepEqual(stack, [], `${name}: unclosed ${stack.join(', ')}`);
}

test('every SVG is well-formed, has a viewBox and a <title>, and renders', async () => {
  assert.equal(CONCEPTS.length, 3, 'three concepts kept in design/logo-options');
  for (const f of ALL_SVGS) {
    const svg = read(f);
    assertWellFormed(svg, f);
    assert.match(svg, /^<svg[^>]*\sviewBox="[\d. -]+"/, `${f}: viewBox`);
    assert.match(svg, /^<svg[^>]*\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${f}: xmlns`);
    assert.match(svg, /<title>[^<]+<\/title>/, `${f}: <title>`);
    const meta = await sharp(Buffer.from(svg)).metadata(); // throws on invalid SVG
    assert.ok(meta.width > 0, `${f}: renders`);
  }
});

test('no SVG has scripts, event handlers, foreignObject, embedded images or outside references', () => {
  for (const f of ALL_SVGS) {
    const svg = read(f);
    assert.doesNotMatch(svg, /<script/i, `${f}: <script>`);
    assert.doesNotMatch(svg, /\son[a-z]+\s*=/i, `${f}: event handler`);
    assert.doesNotMatch(svg, /<foreignObject/i, `${f}: foreignObject`);
    assert.doesNotMatch(svg, /<(image|use|a|iframe|embed|object)[\s>]/i, `${f}: element that can load or link`);
    assert.doesNotMatch(svg, /(xlink:)?href\s*=/i, `${f}: href`);
    assert.doesNotMatch(svg, /url\(|@import|javascript:|data:/i, `${f}: url()/import/data`);
    assert.doesNotMatch(svg, /<!DOCTYPE|<!ENTITY/i, `${f}: DTD/entities`);
    assert.doesNotMatch(svg, /<(linear|radial)Gradient/i, `${f}: gradient`);
  }
});

test('the mark file is under 2 KB', () => {
  assert.ok(statSync(join(PUB, 'brand', 'logo-mark.svg')).size < 2048);
  assert.ok(statSync(join(PUB, 'favicon.svg')).size < 2048);
});

test('the wordmark is outlined (no text or font references)', () => {
  for (const f of BRAND_SVGS) assert.doesNotMatch(read(f), /<text|font-family|@font-face/i, f);
});

test('favicon.svg adapts to dark tabs and has no thin strokes or text', () => {
  const svg = read(join(PUB, 'favicon.svg'));
  assert.match(svg, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.doesNotMatch(svg, /stroke|<text/i);
});

test('logo-mono.svg uses one colour', () => {
  const colours = new Set(read(join(PUB, 'brand', 'logo-mono.svg')).match(/#[0-9a-f]{3,8}\b/gi).map((c) => c.toLowerCase()));
  assert.equal(colours.size, 1, [...colours].join(' '));
});

test('PNG icons have the exact sizes, and the ICO holds 16, 32 and 48', async () => {
  const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512, 'icon-512-maskable.png': 512 };
  for (const [f, s] of Object.entries(sizes)) {
    const m = await sharp(join(PUB, f)).metadata();
    assert.equal(m.format, 'png', f);
    assert.deepEqual([m.width, m.height], [s, s], f);
  }
  const og = await sharp(join(PUB, 'og-image.png')).metadata();
  assert.deepEqual([og.format, og.width, og.height], ['png', 1200, 630]);
  // Apple and maskable icons must be opaque (iOS fills transparency with black)
  for (const f of ['apple-touch-icon.png', 'icon-512-maskable.png']) assert.equal((await sharp(join(PUB, f)).stats()).isOpaque, true, f);

  const ico = readFileSync(join(PUB, 'favicon.ico'));
  assert.deepEqual([ico.readUInt16LE(0), ico.readUInt16LE(2)], [0, 1], 'ICO header');
  const n = ico.readUInt16LE(4);
  const dims = Array.from({ length: n }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
  assert.deepEqual(dims, [16, 32, 48]);
});

test('the maskable icon keeps the mark inside the safe zone', async () => {
  // The centre 80% circle is safe; outside it must be plain background.
  const { data, info } = await sharp(join(PUB, 'icon-512-maskable.png')).raw().toBuffer({ resolveWithObject: true });
  const bg = [data[0], data[1], data[2]];
  for (let y = 0; y < info.height; y += 4) for (let x = 0; x < info.width; x += 4) {
    if (Math.hypot(x - 256, y - 256) <= 0.4 * 512) continue;
    const i = (y * info.width + x) * info.channels;
    assert.deepEqual([data[i], data[i + 1], data[i + 2]], bg, `pixel ${x},${y} outside the safe zone`);
  }
});

test('the manifest is valid and every icon it lists exists at its size', async () => {
  const m = JSON.parse(read(join(PUB, 'manifest.webmanifest')));
  for (const k of ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color']) assert.ok(m[k], k);
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'), 'maskable icon');
  for (const i of m.icons) {
    const file = join(PUB, i.src.replace(/^\//, ''));
    assert.ok(existsSync(file), i.src);
    if (i.type === 'image/png') {
      const meta = await sharp(file).metadata();
      assert.equal(`${meta.width}x${meta.height}`, i.sizes, i.src);
    }
  }
});

test('index.html links the icons, manifest, theme colour and share image', () => {
  const html = read(join(CLIENT, 'index.html'));
  const m = JSON.parse(read(join(PUB, 'manifest.webmanifest')));
  for (const re of [
    /<link rel="icon" href="\/favicon\.ico" sizes="32x32"/,
    /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/,
    /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/,
    /<link rel="manifest" href="\/manifest\.webmanifest"/,
    new RegExp(`<meta name="theme-color" content="${m.theme_color}"`),
    /<meta property="og:image" content="[^"]*\/og-image\.png"/,
    /<meta name="description" content="[^"]+"/,
  ]) assert.match(html, re);
  for (const href of html.match(/(?:href|content)="(\/[^"]+\.(?:svg|ico|png|webmanifest))"/g).map((s) => s.split('"')[1])) {
    assert.ok(existsSync(join(PUB, href.slice(1))), `${href} exists`);
  }
});

test('committed SVGs and manifest match what make-icons.mjs builds from brand-colors.mjs', () => {
  const out = mkdtempSync(join(tmpdir(), 'speakup-icons-'));
  try {
    execFileSync(process.execPath, [join(CLIENT, 'scripts', 'make-icons.mjs'), '--out', out, '--svg-only']);
    for (const f of ['favicon.svg', 'manifest.webmanifest', 'brand/logo-mark.svg', 'brand/logo-horizontal.svg', 'brand/logo-horizontal-dark.svg', 'brand/logo-stacked.svg', 'brand/logo-mono.svg']) {
      assert.equal(read(join(PUB, f)), read(join(out, f)), `${f} is out of date: run npm run icons`);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('logo colours meet contrast: orb 3:1 and wordmark 4.5:1 on light and dark', () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const LIGHT = ['#FFFFFF', C.canvas], DARK = [C.ink, '#202124']; // page, app canvas / dark page, dark browser tab
  for (const bg of LIGHT) {
    assert.ok(ratio(C.blue, bg) >= 3 && ratio(C.pink, bg) >= 3, `orb on ${bg}`);
    assert.ok(ratio(C.blueOnDark, bg) >= 3, `dark-mode orb still fine on ${bg}`);
    assert.ok(ratio(C.ink, bg) >= 4.5, `wordmark on ${bg}`);
  }
  for (const bg of DARK) {
    assert.ok(ratio(C.blueOnDark, bg) >= 3 && ratio(C.pink, bg) >= 3, `orb on ${bg}`);
    assert.ok(ratio(C.inkOnDark, bg) >= 4.5, `wordmark on ${bg}`);
  }
});
