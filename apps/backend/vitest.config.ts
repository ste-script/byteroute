import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    reporters: "default",
    coverage: {
      provider: "custom",
      customProviderModule: "vitest-monocart-coverage",
      // MCR options — passed to monocart-coverage-reports as-is
      coverageReportOptions: {
        name: "Unit Coverage (Vitest)",
        outputDir: "coverage/unit",
        reports: [
          ["raw", { outputDir: "raw" }],
          ["console-summary"],
          ["console-details"],
        ],
        sourceFilter: {
          "**/node_modules/**": false,
          "**/src/mock/**": false,
          "**/src/**": true,
        },
        cleanCache: true,
      },
    } as never,
  }
});
