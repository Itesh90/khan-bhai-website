import fc from "fast-check";

/**
 * Generators for Razorpay-style ids. Each matches the documented regex used by
 * the verification + schema layers:
 *   order_[A-Za-z0-9]+   pay_[A-Za-z0-9]+   rfnd_[A-Za-z0-9]+   evt_[A-Za-z0-9]+
 */
const ALNUM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

const alnumChar = fc.constantFrom(...ALNUM);

export function alnumString(min = 10, max = 18): fc.Arbitrary<string> {
  return fc
    .array(alnumChar, { minLength: min, maxLength: max })
    .map((cs) => cs.join(""));
}

export const orderIdArb = alnumString().map((s) => `order_${s}`);
export const paymentIdArb = alnumString().map((s) => `pay_${s}`);
export const refundIdArb = alnumString().map((s) => `rfnd_${s}`);
export const eventIdArb = alnumString().map((s) => `evt_${s}`);

/** A non-empty hex string of the given byte length (2 hex chars per byte). */
export function hexStringArb(bytes = 32): fc.Arbitrary<string> {
  const hexChar = fc.constantFrom(..."0123456789abcdef".split(""));
  return fc
    .array(hexChar, { minLength: bytes * 2, maxLength: bytes * 2 })
    .map((cs) => cs.join(""));
}
