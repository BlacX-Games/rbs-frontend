import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads `src/design/tokens.css` and hands back the declared custom properties.
 *
 * The point of parsing the real stylesheet rather than importing a TypeScript
 * copy of the palette: the suite then asserts against what actually ships. A
 * duplicated table in TS can pass every gate while the CSS that reaches the
 * browser has drifted.
 *
 * Read from disk rather than imported. `import … from '…css?raw'` looks tidier
 * but resolves to an empty string here — `css: false` in the Vitest config
 * stubs every CSS import, `?raw` included. And `import.meta.url` is not a
 * file: URL under jsdom, so the path is resolved from the project root, which
 * is where npm and Vitest both run.
 */

const TOKENS_PATH = join(process.cwd(), 'src', 'design', 'tokens.css');

export type TokenMap = ReadonlyMap<string, string>;

export function readTokensCss(): string {
  if (!existsSync(TOKENS_PATH)) {
    throw new Error(`tokens.css not found at ${TOKENS_PATH} — run vitest from the project root.`);
  }

  // Comments are stripped first — the header prose quotes selectors like
  // `[data-theme='light']`, and a naive search would match the explanation
  // instead of the rule.
  return readFileSync(TOKENS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Returns the `{ … }` body that follows `from`, matched on balanced braces. */
function blockAfter(css: string, from: number): string {
  const open = css.indexOf('{', from);
  if (open === -1) throw new Error('No block found');

  let depth = 0;

  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  throw new Error('Unbalanced braces in tokens.css');
}

function declarationsIn(block: string): TokenMap {
  const tokens = new Map<string, string>();

  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (name && value) tokens.set(name, value.trim().replace(/\s+/g, ' '));
  }

  return tokens;
}

/**
 * Custom properties declared by the first rule whose selector contains
 * `selector`. Nested at-rules are not searched — pass `within` for those.
 */
export function tokensForSelector(selector: string, within?: string): TokenMap {
  let css = readTokensCss();

  if (within) {
    const atRule = css.indexOf(within);
    if (atRule === -1) throw new Error(`No at-rule matching "${within}" in tokens.css`);
    css = blockAfter(css, atRule);
  }

  const index = css.indexOf(selector);
  if (index === -1) throw new Error(`No rule matching "${selector}" in tokens.css`);

  return declarationsIn(blockAfter(css, index));
}

/** The three colour blocks the §5.2 gates care about. */
export const darkTokens = (): TokenMap => tokensForSelector("[data-theme='dark']");
export const lightTokens = (): TokenMap => tokensForSelector("[data-theme='light']");
export const lightMediaTokens = (): TokenMap =>
  tokensForSelector(':root:where(:not([data-theme]))', '@media (prefers-color-scheme: light)');

/** Throws with the token name rather than returning undefined into a matcher. */
export function token(tokens: TokenMap, name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`tokens.css declares no ${name}`);
  return value;
}
