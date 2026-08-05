#!/usr/bin/env node
/**
 * Fetch the self-hosted webfonts into `public/fonts/`.
 *
 * §5.3 requires the three faces be self-hosted with NO external CDN — the GDD's
 * privacy-first stance rules out a third-party font request from an admin
 * surface, where the referrer alone leaks which console an operator is using.
 *
 * The downloaded `.woff2` files are COMMITTED. This script exists to document
 * and reproduce where they came from, not to run during install or build; a
 * build that reached the network would defeat the point.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Only the `latin` subset is taken. §5.3 asks for "Latin + the glyphs actually
 * used", which needs `fonttools`/`pyftsubset`; Google already publishes a
 * per-subset split, and its latin range covers everything the console renders —
 * including U+2212, the true minus sign §5.1 mandates for negative numbers.
 * Glyph-level subsetting is a Phase 10 size optimisation, not a blocker.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');

// Google serves .woff2 only to UAs it believes support it; the default fetch
// agent gets .ttf, which is roughly four times the size.
const MODERN_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Axis order in a css2 query is not free-form: lowercase axes come first, each
 * group alphabetical, and the value ranges follow in the same order.
 */
const FAMILIES = [
  {
    file: 'inter-latin-variable.woff2',
    query: 'Inter:wght@100..900',
    licenseSlug: 'inter',
  },
  {
    file: 'fraunces-latin-variable.woff2',
    query: 'Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1',
    licenseSlug: 'fraunces',
  },
  {
    file: 'jetbrains-mono-latin-variable.woff2',
    query: 'JetBrains+Mono:wght@100..800',
    licenseSlug: 'jetbrainsmono',
  },
];

/** Pulls the `/* latin *​/`-labelled @font-face block out of a css2 response. */
function extractLatinFace(css) {
  // Blocks are introduced by a subset comment: `/* latin-ext */`, `/* latin */`.
  const blocks = css.split(/\/\*\s*([a-z0-9-]+)\s*\*\//i).slice(1);

  for (let i = 0; i < blocks.length; i += 2) {
    if (blocks[i]?.trim() !== 'latin') continue;

    const body = blocks[i + 1] ?? '';
    const src = /src:\s*url\((https:\/\/[^)]+\.woff2)\)/.exec(body)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)?.[1]?.trim();
    const weight = /font-weight:\s*([^;]+);/.exec(body)?.[1]?.trim();

    if (src && unicodeRange && weight) return { src, unicodeRange, weight };
  }

  return null;
}

async function get(url, accept) {
  const response = await fetch(url, { headers: { 'User-Agent': MODERN_UA, Accept: accept } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response;
}

await mkdir(OUT_DIR, { recursive: true });

for (const { file, query, licenseSlug } of FAMILIES) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  const face = extractLatinFace(await (await get(cssUrl, 'text/css,*/*')).text());

  if (!face) throw new Error(`No latin subset in the css2 response for ${query}`);

  const bytes = Buffer.from(await (await get(face.src, 'font/woff2')).arrayBuffer());
  await writeFile(join(OUT_DIR, file), bytes);

  // OFL requires the licence travel with the font. Sourced from the upstream
  // repository, since the css2 API does not serve it.
  const license = await (
    await get(
      `https://raw.githubusercontent.com/google/fonts/main/ofl/${licenseSlug}/OFL.txt`,
      'text/plain',
    )
  ).text();
  await writeFile(join(OUT_DIR, `${licenseSlug}-OFL.txt`), license);

  console.log(`${file}  ${(bytes.length / 1024).toFixed(1)} KB`);
  console.log(`  font-weight:   ${face.weight}`);
  console.log(`  unicode-range: ${face.unicodeRange}`);
  console.log(`  upstream:      ${face.src}\n`);
}

console.log(
  'Done. Copy the font-weight and unicode-range above into src/design/fonts.css\n' +
    'if they have changed, then commit public/fonts/.',
);
