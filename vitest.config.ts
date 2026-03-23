import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./tests/integration/globalSetup.ts",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // singleFork keeps the dev server singleton across all test files (vitest 4 API)
    singleFork: true,
    include: ["tests/integration/**/*.test.ts"],
    reporters: ["verbose"],
  },
});
