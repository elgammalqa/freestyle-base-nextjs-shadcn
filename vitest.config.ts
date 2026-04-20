import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only ships a stub that throws on client import — that's
      // what enforces the RSC boundary at build time. Vitest runs in
      // node and isn't a client, so alias it to an empty module.
      "server-only": path.resolve(__dirname, "__tests__/_shims/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/_shims/**"],
    testTimeout: 30_000,
  },
});
