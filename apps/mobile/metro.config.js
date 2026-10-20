const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Expo detects the pnpm workspace and watches its packages (@template/shared).
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
