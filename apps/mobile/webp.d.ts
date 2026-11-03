// The images of content/games/images.ts: Metro makes each one an asset it
// bundles with the app.
declare module "*.webp" {
  const image: import("react-native").ImageSourcePropType;
  export default image;
}
