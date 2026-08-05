/**
 * Colour maths for the palette gates — IMPLEMENTATION_PLAN.md §5.2.
 *
 * Hand-rolled rather than pulled from a library, for two reasons. The Phase 0
 * commit set the precedent of not installing anything unused, and this is
 * ~90 lines of stable, well-specified arithmetic used only at test time. More
 * importantly it is *verified*: this implementation reproduces all 19 published
 * contrast ratios and all nine published ΔE figures in §5.2 exactly, so the
 * suite can assert the documented numbers to a tight tolerance instead of
 * hedging around an unknown validator's rounding.
 *
 * References:
 *   WCAG 2.2 relative luminance and contrast ratio — w3.org/TR/WCAG22/#dfn-contrast-ratio
 *   OKLab — Björn Ottosson, bottosson.github.io/posts/oklab/
 *   CVD simulation — Machado, Oliveira & Fernandes (2009), severity 1.0
 */

type Vec3 = readonly [number, number, number];
type Matrix3 = readonly [Vec3, Vec3, Vec3];

/** Deficiency types the §5.2 gates are measured under. */
export const CVD_TYPES = ['protan', 'deutan', 'tritan'] as const;
export type CvdType = (typeof CVD_TYPES)[number];

/**
 * Machado et al. severity-1.0 matrices. These operate on LINEAR sRGB — applying
 * them to gamma-encoded values is the classic way to get plausible-looking but
 * wrong ΔE figures.
 */
const CVD_MATRICES: Readonly<Record<CvdType, Matrix3>> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function toLinearChannel(srgb: number): number {
  return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/** `#rgb` or `#rrggbb` → linear-light sRGB. Throws rather than guessing. */
export function parseHex(hex: string): Vec3 {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Not an opaque hex colour: "${hex}"`);

  const digits = match[1];
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;
  const n = Number.parseInt(full, 16);

  return [
    toLinearChannel(((n >> 16) & 0xff) / 255),
    toLinearChannel(((n >> 8) & 0xff) / 255),
    toLinearChannel((n & 0xff) / 255),
  ];
}

export function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function relativeLuminance([r, g, b]: Vec3): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio, 1–21. Order-independent — the brighter colour is always
 * the numerator, so callers never have to think about which is foreground.
 */
export function contrastRatio(a: string, b: string): number {
  const [brighter, darker] = [relativeLuminance(parseHex(a)), relativeLuminance(parseHex(b))].sort(
    (x, y) => y - x,
  ) as [number, number];

  return (brighter + 0.05) / (darker + 0.05);
}

function toOklab([r, g, b]: Vec3): Vec3 {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function simulate(rgb: Vec3, cvd: CvdType): Vec3 {
  const m = CVD_MATRICES[cvd];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  return [
    clamp(m[0][0] * rgb[0] + m[0][1] * rgb[1] + m[0][2] * rgb[2]),
    clamp(m[1][0] * rgb[0] + m[1][1] * rgb[1] + m[1][2] * rgb[2]),
    clamp(m[2][0] * rgb[0] + m[2][1] * rgb[1] + m[2][2] * rgb[2]),
  ];
}

function distance(a: Vec3, b: Vec3): number {
  const [al, aa, ab] = toOklab(a);
  const [bl, ba, bb] = toOklab(b);
  // §5.2 quotes "OKLab ×100": plain Euclidean distance, scaled for readability.
  return 100 * Math.hypot(al - bl, aa - ba, ab - bb);
}

/** Perceptual separation under normal vision. §5.2's floor for status pairs is 15. */
export function deltaE(a: string, b: string): number {
  return distance(parseHex(a), parseHex(b));
}

/**
 * OKLab L, 0–1. Perceptual lightness — the axis an ORDINAL ramp has to move
 * monotonically along if the reader is to see the order in the colour.
 */
export function oklabLightness(hex: string): number {
  return toOklab(parseHex(hex))[0];
}

export function deltaEUnderCvd(a: string, b: string, cvd: CvdType): number {
  return distance(simulate(parseHex(a), cvd), simulate(parseHex(b), cvd));
}

/**
 * The number that actually gates a palette: the worst any of the three
 * deficiencies makes a pair look. A pair is only as good as its weakest
 * simulation.
 */
export function worstDeltaEUnderCvd(a: string, b: string): number {
  return Math.min(...CVD_TYPES.map((cvd) => deltaEUnderCvd(a, b, cvd)));
}
