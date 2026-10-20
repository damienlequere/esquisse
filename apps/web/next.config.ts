import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages are shipped as TypeScript sources.
  transpilePackages: ["@template/shared"],
};

export default config;
