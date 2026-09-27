import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    environment: "node",
    // Browser tests run separately through Playwright.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
