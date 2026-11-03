// The images of games/images.ts, as this package sees them: what they are is
// up to each app's bundler, and each app declares it.
declare module "*.webp" {
  const image: unknown;
  export default image;
}
