import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/core/**/*.ts"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95
      }
    }
  }
});
