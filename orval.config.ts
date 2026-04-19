import { defineConfig } from "orval";

export default defineConfig({
  "api-client": {
    input: { target: "./openapi.yaml" },
    output: {
      target: "./lib/api-client/generated/api.ts",
      client: "react-query",
      mode: "split",
      baseUrl: "/api",
      clean: true,
      override: {
        mutator: {
          path: "./lib/api-client/custom-fetch.ts",
          name: "customFetch",
        },
      },
    },
  },
  zod: {
    input: { target: "./openapi.yaml" },
    output: {
      target: "./lib/api-zod/generated/zod.ts",
      client: "zod",
      mode: "split",
      clean: true,
      override: {
        zod: {
          coerce: { query: ["boolean", "number", "string"] },
        },
      },
    },
  },
});
