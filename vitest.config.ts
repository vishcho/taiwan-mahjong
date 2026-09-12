import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "app/**/*.test.ts"],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
