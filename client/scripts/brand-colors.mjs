// The logo colours, read from the design tokens (src/styles/tokens.css, palette A).
// Change the palette there, then run `npm run icons` to rebuild every SVG, PNG, ICO and the manifest.
import { loadTokens } from './check-contrast.mjs';

const t = loadTokens('a');
export const COLORS = {
  blue: t.brand, // orb body on light backgrounds, theme colour
  blueOnDark: t['brand-500'], // orb body on dark backgrounds
  pink: t.mistake, // middle blob
  yellow: t.marker, // core blob, and the marker in the share image
  ink: t['text-primary'], // wordmark on light, the one-colour print logo
  inkOnDark: t['text-inverse'], // wordmark on dark
  white: t['text-inverse'],
  canvas: t['surface-canvas'], // app background (manifest background, share image)
};
