import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/integration/**/*.spec.ts"],
    testTimeout: 15_000,
  },
});
