import type { NextConfig } from "next";

// TypeScript and ESLint gate `next build`. Previously both were silenced
// via `ignoreBuildErrors: true` / `ignoreDuringBuilds: true`, which let
// broken imports (e.g. missing `insertCustomerSchema` re-export) ship to
// the dev preview as Turbopack runtime errors instead of failing the build
// loudly up front. If the codegen pipeline is out of sync with openapi.yaml
// or db/schema, we want `npm run build` to refuse to build, not paper over.
const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
};

export default nextConfig;
