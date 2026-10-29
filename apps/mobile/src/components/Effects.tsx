import { type Effect, effectShader } from "@esquisse/shared";
import {
  Canvas,
  type DataSourceParam,
  Fill,
  Group,
  ImageShader,
  Shader,
  type SkImage,
  Skia,
  useClock,
  useImage,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { ImageSourcePropType } from "react-native";
import { useDerivedValue, useReducedMotion } from "react-native-reanimated";

// The background's animations (see effects.ts in packages/shared), drawn by
// React Native Skia over the background, the same shaders as the web site's
// (apps/web/components/Effects.tsx): only what moves, transparent elsewhere.
// They fade in as they start, so the lights do not jump. Nothing moves for whom
// asks for less motion. Not on the web build of this app: Skia would need
// CanvasKit loaded there first.

// The fade in, in milliseconds.
const FADE = 1500;

type Size = { width: number; height: number };

export const Effects = ({
  effects,
  background,
  files,
  size,
}: {
  effects: Effect[];
  background: ImageSourcePropType;
  // Each effect's own images, by its id (see effectFiles).
  files: Record<string, ImageSourcePropType[]>;
  size: Size;
}) => {
  const reduced = useReducedMotion();
  const image = useImage(background as DataSourceParam);
  const clock = useClock();
  const fade = useDerivedValue(() => Math.min(1, clock.value / FADE));
  if (reduced || image === null) return null;
  return (
    <Canvas style={{ position: "absolute", ...size }} pointerEvents="none">
      <Group opacity={fade}>
        {effects.map((e) => (
          <Layer key={e.id} effect={e} image={image} files={files[e.id] ?? []} size={size} />
        ))}
      </Group>
    </Canvas>
  );
};

// An effect has one or two images of its own (see effectFiles): both are
// asked for, the second maybe for none.
const Layer = ({
  effect,
  image,
  files,
  size,
}: {
  effect: Effect;
  image: SkImage;
  files: ImageSourcePropType[];
  size: Size;
}) => {
  const source = useMemo(() => {
    const sksl = effectShader(effect.kind);
    return sksl === undefined ? null : Skia.RuntimeEffect.Make(sksl);
  }, [effect.kind]);
  const first = useImage(files[0] as DataSourceParam);
  const second = useImage(files[1] as DataSourceParam);
  const own = [first, second].slice(0, files.length);
  const clock = useClock();
  const { width, height } = size;
  const uniforms = useDerivedValue(() => ({ size: [width, height], time: clock.value / 1000 }));
  if (source === null || own.length === 0 || own.some((i) => i === null)) return null;
  const rect = { x: 0, y: 0, width, height };
  return (
    <Fill>
      <Shader source={source} uniforms={uniforms}>
        {[image, ...own].map((i, k) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the images' order is the shader's
          <ImageShader key={k} image={i} fit="fill" rect={rect} />
        ))}
      </Shader>
    </Fill>
  );
};
