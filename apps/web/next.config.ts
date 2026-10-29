import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages are shipped as TypeScript sources.
  transpilePackages: ["@esquisse/shared"],
  // CanvasKit (see components/Effects.tsx) asks for fs only when run by Node.
  turbopack: { resolveAlias: { fs: { browser: "./empty.ts" } } },
};

export default config;
