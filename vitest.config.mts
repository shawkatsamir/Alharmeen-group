import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the `@/*` -> `./src/*` alias straight from tsconfig.json, so
    // the alias can never drift between Next and Vitest. Native in Vite 7+;
    // no vite-tsconfig-paths plugin needed.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Playwright specs are also .ts — keep the two runners from picking up
    // each other's files.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // Explicit imports from "vitest" rather than globals, so tsconfig.json
    // needs no `types` entry (it currently has none).
    globals: false,
  },
});
