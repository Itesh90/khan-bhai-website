import fc from "fast-check";

/**
 * Paise (integer) generator in the open-closed range (0, 1_000_000_000_000].
 * Mirrors the money bounds the payment layer enforces.
 */
export const paiseArb: fc.Arbitrary<number> = fc.integer({
  min: 1,
  max: 1_000_000_000_000,
});

/** Whole-rupee amount in (0, 10_000_000] — the app's sanity cap. */
export const rupeesArb: fc.Arbitrary<number> = fc.integer({
  min: 1,
  max: 10_000_000,
});

/** The single source of truth for rupee -> paise conversion under test. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
