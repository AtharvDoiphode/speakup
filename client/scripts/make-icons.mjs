// Builds every logo file from brand-colors.mjs and the hand-written geometry below.
//   npm run icons                  -> writes into client/public
//   node scripts/make-icons.mjs --out <dir> [--svg-only]   (used by the tests)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLORS as C } from './brand-colors.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(HERE, '..', 'public');
if (!OUT) throw new Error('--out needs a directory');
const SVG_ONLY = args.includes('--svg-only');
const TEXT = JSON.parse(readFileSync(join(HERE, 'brand-outlines.json'), 'utf8'));

// The mark, on a 64-unit grid: the voice orb as three hand-drawn blobs. A blue body,
// a pink blob spilling past its top-right edge, and a yellow core set off-centre (never a bullseye).
const BLUE = 'M27 10C40 6.5 53.5 13 56 27C58.5 41 50 55 35 57.5C20 60 7.5 51 5.5 37C3.5 23.5 13.5 13.5 27 10Z';
const PINK = 'M37 5C48.5 3.5 59 11 58.5 22.5C58 31 52 35.5 46 39.5C40 43.5 30 45 24.5 39C19 33 19.5 22 24 14.5C27 9 31 5.8 37 5Z';
const CORE = 'M30 17C38 15.5 44 21 43.5 28.5C43 36 37 41.5 29.5 41C22 40.5 17.5 35 18.5 28C19.5 21.5 23.5 18 30 17Z';
const MARK_BOX = '2.5 2 58 58'; // tight square around the blobs (x 5-58.6, y 3.5-58)

const svg = (viewBox, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><title>${title}</title>${body}</svg>\n`;

// The mark switches its blue with the viewer's light/dark setting (the fill attribute is the fallback).
// The wordmark files don't switch: a page with a light header in a dark-mode OS would lose the text.
const MARK_STYLE = `<style>.b{fill:${C.blue}}@media (prefers-color-scheme:dark){.b{fill:${C.blueOnDark}}}</style>`;
const mark = (blue = C.blue) => `<path class="b" fill="${blue}" d="${BLUE}"/><path fill="${C.pink}" d="${PINK}"/><path fill="${C.yellow}" d="${CORE}"/>`;
const word = (ink) => `<path fill="${ink}" d="${TEXT.wordmark.speak}${TEXT.wordmark.up}"/>`;
// One colour: even-odd turns the overlaps into cut-outs (blue only, pink only and the core stay solid)
const mono = (fill) => `<path fill="${fill}" fill-rule="evenodd" d="${BLUE}${PINK}${CORE}"/>`;
// Mark, then the wordmark (cap height 26.4) centred on the mark
const horizontal = (m, w) => svg('3 2 238 57.5', 'SpeakUp', `${m}<g transform="translate(70 44)">${w}</g>`);

const files = {
  'favicon.svg': svg(MARK_BOX, 'SpeakUp', MARK_STYLE + mark()),
  'brand/logo-mark.svg': svg(MARK_BOX, 'SpeakUp', MARK_STYLE + mark()),
  'brand/logo-horizontal.svg': horizontal(mark(), word(C.ink)),
  'brand/logo-horizontal-dark.svg': horizontal(mark(C.blueOnDark), word(C.inkOnDark)),
  'brand/logo-stacked.svg': svg('0 2 171 105', 'SpeakUp', `<g transform="translate(53 0)">${mark()}</g><g transform="translate(0 99)">${word(C.ink)}</g>`),
  'brand/logo-mono.svg': horizontal(mono(C.ink), word(C.ink)),
  'manifest.webmanifest': JSON.stringify({
    name: 'SpeakUp',
    short_name: 'SpeakUp',
    description: 'Speak first. We tidy the grammar after.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: C.blue,
    background_color: C.canvas,
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2) + '\n',
};

// App icon: the full-colour mark on a white tile.
// `fill` is the share of the tile the 58-unit mark box takes (0.56 keeps it inside the maskable safe circle).
function tile(size, { fill = 0.66, radius = 0 } = {}) {
  const s = (size * fill) / 58;
  const t = (n) => +n.toFixed(3);
  return svg(`0 0 ${size} ${size}`, 'SpeakUp', `<rect width="${size}" height="${size}" rx="${t(size * radius)}" fill="${C.white}"/>`
    + `<g transform="translate(${t(size / 2 - 31.5 * s)} ${t(size / 2 - 31 * s)}) scale(${t(s)})">${mark()}</g>`);
}

// The voice orb from components/VoiceOrb.jsx, frozen at one moment: three wobbly blobs,
// blue outside, pink, yellow core, each a circle whose radius follows the same sine waves.
function orb(cx, cy, size, t = 3, amp = 0.07) {
  const layers = [[C.blue, 1, 0, 1], [C.pink, 0.92, 2.1, 0.8], [C.yellow, 0.96, 4.2, 0.52]];
  const f = (n) => +n.toFixed(1);
  return layers.map(([fill, alpha, phase, scale], i) => {
    const base = size * scale;
    const x0 = cx + Math.cos(t * 0.7 + phase) * base * 0.16 * i;
    const y0 = cy + Math.sin(t * 0.9 + phase) * base * 0.16 * i;
    const pts = Array.from({ length: 48 }, (_, j) => {
      const a = (j / 48) * Math.PI * 2;
      const wave = Math.sin(a * 3 + t * 1.1 + phase) * 0.5 + Math.sin(a * 5 - t * 0.8 + phase * 1.7) * 0.3 + Math.sin(a * 2 + t * 0.6 + phase * 0.7) * 0.4;
      const r = base * (1 + amp * wave);
      return [x0 + Math.cos(a) * r, y0 + Math.sin(a) * r];
    });
    const mid = (p, q) => `${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
    const d = `M${mid(pts[47], pts[0])}` + pts.map((p, j) => `Q${f(p[0])} ${f(p[1])} ${mid(p, pts[(j + 1) % 48])}`).join('') + 'Z';
    return `<path fill="${fill}"${alpha < 1 ? ` fill-opacity="${alpha}"` : ''} d="${d}"/>`;
  }).join('');
}

// Share image: logo, the tagline with "tidy" under a marker, and the orb.
function ogImage() {
  const k = 56 / TEXT.tagline.size;
  const [t0, t1] = TEXT.tagline.line2.tidy.map((x) => +(x * k).toFixed(1));
  return svg('0 0 1200 630', 'SpeakUp: Speak first. We tidy the grammar after.',
    `<rect width="1200" height="630" fill="${C.canvas}"/>` + orb(1050, 320, 235)
    + `<g transform="translate(80 84) scale(1.5)">${mark()}<g transform="translate(70 44)">${word(C.ink)}</g></g>`
    + `<g transform="translate(84 330) scale(${k})" fill="${C.ink}"><path d="${TEXT.tagline.line1.d}"/></g>`
    + `<rect x="${84 + t0 - 6}" y="374" width="${t1 - t0 + 12}" height="44" rx="6" fill="${C.yellow}" transform="rotate(-1.5 ${84 + (t0 + t1) / 2} 392)"/>`
    + `<g transform="translate(84 410) scale(${k})" fill="${C.ink}"><path d="${TEXT.tagline.line2.d}"/></g>`);
}

mkdirSync(join(OUT, 'brand'), { recursive: true });
for (const [f, text] of Object.entries(files)) writeFileSync(join(OUT, f), text);

if (!SVG_ONLY) {
  const { default: sharp } = await import('sharp');
  const { default: pngToIco } = await import('png-to-ico');
  const png = (svgText, size) => sharp(Buffer.from(svgText), { density: 72 * (size / 56) }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  // The ICO is for browsers without SVG favicons, so it uses the light-tab colours
  const plainMark = svg(MARK_BOX, 'SpeakUp', mark());
  writeFileSync(join(OUT, 'favicon.ico'), await pngToIco(await Promise.all([16, 32, 48].map((s) => png(plainMark, s)))));
  writeFileSync(join(OUT, 'apple-touch-icon.png'), await sharp(Buffer.from(tile(180))).flatten().png().toBuffer());
  writeFileSync(join(OUT, 'icon-192.png'), await sharp(Buffer.from(tile(192, { radius: 0.22 }))).png().toBuffer());
  writeFileSync(join(OUT, 'icon-512.png'), await sharp(Buffer.from(tile(512, { radius: 0.22 }))).png().toBuffer());
  writeFileSync(join(OUT, 'icon-512-maskable.png'), await sharp(Buffer.from(tile(512, { fill: 0.56 }))).flatten().png().toBuffer());
  writeFileSync(join(OUT, 'og-image.png'), await sharp(Buffer.from(ogImage())).png({ compressionLevel: 9 }).toBuffer());
}
console.log(`Brand files written to ${OUT}${SVG_ONLY ? ' (SVG and manifest only)' : ''}`);
