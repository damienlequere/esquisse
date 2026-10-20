// Code shared by the web site and the mobile app: no DOM nor React Native here,
// only plain TypeScript.

export const APP_NAME = "Template";

export const TAGLINE = "A monorepo template for a web site and mobile apps.";

export const greeting = (name: string) => `Hello, ${name.trim() || "you"}!`;
