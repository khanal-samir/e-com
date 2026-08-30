import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const alias = { "@": path.resolve(import.meta.dirname, "src") };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias,
          // @imagekit/next exports only main/module keys, no "default"/"import"
          conditions: ["module", "node", "development"],
        },
        plugins: [react()],
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup/jsdom.ts"],
          testTimeout: 15000,
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "src"),
            "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // serial: integration tests share the Neon testing DB
          fileParallelism: false,
          sequence: { concurrent: false },
          setupFiles: ["tests/setup/env.ts", "tests/setup/database.ts"],
          testTimeout: 30000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "smoke",
          environment: "node",
          include: ["tests/smoke/**/*.test.ts"],
          testTimeout: 30000,
        },
      },
    ],
  },
});
