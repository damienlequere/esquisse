// Code shared by the web site and the mobile app: no DOM nor React Native here,
// only plain TypeScript.

export const APP_NAME = "Esquisse";

export const TAGLINE = "Clickable illustrated scenes.";

export const greeting = (name: string) => `Hello, ${name.trim() || "you"}!`;
