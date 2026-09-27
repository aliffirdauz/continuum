import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "node",
    // Integration tests need the running stack; see vitest.integration.config.ts.
    exclude: [...configDefaults.exclude, "test/integration/**"],
    globals: true,
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
  },
});
