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

  // bundle-barrel-imports: tree-shake heavy barrel imports at build time.
  // Each entry below has a deep barrel and >50KB worth of unused exports
  // when imported flat. Without this, every `import { Users } from "lucide-react"`
  // pulls the full icon registry into the bundle. With it, only the icons
  // you import are kept.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },

  // Baseline security headers. Free safety, no perf cost. Apps generated
  // from this template inherit a passing scorecard from securityheaders.com
  // out of the box. Add a CSP via your own middleware if you have inline
  // scripts that need nonces.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
