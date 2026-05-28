import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Next.js compiles JSX with the automatic runtime (react/jsx-runtime); mirror
  // that here so server components under test don't need React in scope.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> "./*" path alias so test imports resolve.
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Forks give each test file a clean module registry — important for the
    // Razorpay singleton and env-var stubbing in tests/setup.ts.
    pool: "forks",
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/payments/**", "lib/services/paymentService.ts"],
    },
  },
});
