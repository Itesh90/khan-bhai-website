/**
 * Vitest global setup — Khan Bhai S. payment tests.
 *
 * Loads `.env.test` if present, then guarantees the Razorpay credentials the
 * crypto helpers read are non-empty so signature verification has a key to work
 * with. These are deterministic TEST values — never real secrets.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const envTestPath = path.resolve(__dirname, "..", ".env.test");
if (existsSync(envTestPath)) {
  for (const line of readFileSync(envTestPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

process.env.RAZORPAY_KEY_ID ||= "rzp_test_key_id";
process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||= "rzp_test_key_id";
process.env.RAZORPAY_KEY_SECRET ||= "test_key_secret_do_not_use_in_prod";
process.env.RAZORPAY_WEBHOOK_SECRET ||= "test_webhook_secret_do_not_use_in_prod";
