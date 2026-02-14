import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    reporters: "default",
    coverage: {
      provider: "v8",
      reportsDirectory: "../../coverage/apps-backend",
      reporter: ["text", "text-summary", "html", "json-summary", "cobertura"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/mock/**",
        "src/**/*.test.ts",
        "test/**/*.ts",
      ],
    },
  }
});
