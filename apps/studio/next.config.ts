import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages are shipped as TypeScript sources; the preview plays
  // scenes with the web site's own components (see app/(preview)).
  transpilePackages: ["@esquisse/content", "@esquisse/engine", "@esquisse/web"],
  // Its badge would sit over the preview's buttons.
  devIndicators: false,
  // CanvasKit (see apps/web/components/Effects.tsx) asks for fs only when run by Node.
  turbopack: { resolveAlias: { fs: { browser: "./empty.ts" } } },
};

export default config;
