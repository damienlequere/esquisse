// The API keys, from the environment, then packages/generator/.env.local, then
// .env. Node's loadEnvFile leaves a variable that is already set alone, so the
// files are loaded from the one that wins.

import { existsSync } from "node:fs";
import { join } from "node:path";

const GENERATOR = join(import.meta.dirname, "..");

for (const file of [".env.local", ".env"]) {
  const path = join(GENERATOR, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

export const apiKey = (name: "ANTHROPIC_API_KEY" | "GEMINI_API_KEY") => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing: set it in packages/generator/.env.local or .env.`);
  }
  return value;
};
