# Esquisse

Clickable illustrated scenes: a web site and mobile apps (iOS, Android).

```
apps/
  web/       Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
  mobile/    Expo SDK 57 (React Native 0.86) + Expo Router + NativeWind 4
packages/
  shared/    Plain TypeScript shared by both apps (@esquisse/shared)
```

Tooling: pnpm workspaces (versions in the `catalog:` of `pnpm-workspace.yaml`),
Turborepo for tasks, Biome for lint and format.

## Setup

```bash
pnpm install
vercel link   # see below
eas init      # for builds on Expo's servers
```

## Commands

```bash
pnpm install
pnpm dev             # web site: http://localhost:3000 (the scene: /scene/phare)
pnpm dev:mobile      # Expo dev server: scan the QR code with Expo Go
pnpm dev:all         # both, through Turborepo
pnpm build           # production builds
pnpm typecheck
pnpm lint            # pnpm format to fix
pnpm loc             # lines of code per app and package (source / tests)
pnpm deploy:preview  # lint, typecheck, then deploy the web site to a Vercel preview URL
pnpm deploy:prod     # same, to production
```

## Deploying the web site (Vercel)

Once, from the repository root: `vercel link`, to create or pick the Vercel
project, then in its settings set **Root Directory** to `apps/web` (Vercel
installs the whole pnpm workspace, so `@esquisse/shared` is found). The deploy
scripts then upload from the root. The region is set in `apps/web/vercel.json`
(`fra1`, Paris).

The scripts are not named `deploy`: `pnpm deploy` is a built-in pnpm command.

## Clickable scenes

`/scene/phare` on the web site, and in the mobile app, is a
clickable scene, ported from protagonist's `prototypes/scene-cliquable`: the
place's image fills the frame, each action is a clickable part of the image, and
the characters, clickable too, open a dialogue. On the web, the frame adapts to the screen, like any page under
`app/scene/`; in the mobile app, the scene takes the whole screen. With no hover
on a phone, the ✦ button shows for a moment what is clickable.

- **The image is 9:16**, in `cover`: a phone crops its sides (9% each), a tablet
  its top and bottom (12.5% each). What stays visible everywhere, minus the text
  band at the bottom and the top bar, is the **safe zone** (`safe` in
  `scene.json`).
- **The composition is imposed** at generation by a guide sent with the prompt
  (`sources/guide.png`): one colored rectangle per object, "VIDE" zones where
  the characters will stand.
- **The objects are detected afterwards** by Gemini in vision (`objects.json`),
  then checked against the safe zone.
- **The characters are layers**: generated alone on a green background, with the
  background image sent for style and light, then keyed out. They are placed by
  their feet (`anchor`) at a given height, so they can come and go without
  changing the background.
- Everything placed on the image is in % of the image, so it follows the cropping.

| File | Role |
| --- | --- |
| `packages/shared/src/scenes/<id>/scene.json` | The scene: safe zone, prompts, positions, texts and dialogues |
| `packages/shared/src/scenes/<id>/objects.json`, `characters.json` | Detected boxes, layers' proportions (generated) |
| `packages/shared/src/scenes/index.ts` | The scenes, for both apps (`scenes.phare`), and their types |
| `apps/web/scenes/<id>/sources/` | Original images and the composition guide |
| `packages/shared/assets/scenes/<id>/` | Converted images, for both apps |
| `apps/web/scenes.ts`, `apps/mobile/src/scenes.ts` | Each app's list of the images, by hand: Next and Metro each need every import spelled out |
| `apps/web/components/Scene.tsx`, `apps/mobile/src/components/Scene.tsx` | The scene, in each app |
| `apps/web/scripts/generate-scene.ts` | Generates the background, detects the objects, generates and keys the characters |

`pnpm --filter @esquisse/web generate <id>` only does the steps whose result is
missing; `fond`, `reperage` or `personnages` after the id redoes that step
(redoing the background redoes everything). It needs `GEMINI_API_KEY` in
`apps/web/.env.local`.

## The device frame (web)

The scenes are shown in a device frame: on a large screen with a mouse, a
phone (9:19.5), or a tablet (3:4) from 1024 px wide; on a phone or a touch
tablet, the whole screen. Everything lives in two places:

- `apps/web/app/scene/[id]/layout.tsx`: the `#stage` and `#device` elements;
- `apps/web/app/globals.css`: their styles, under a media query.

Any route under `app/scene/` gets the frame. Dialogs and menus must open in
`#device` (positioned), not on `body`.

## Notes

- Mobile TypeScript stays on the version Expo expects (`~6.0.3`); web and shared
  use the catalog's (7.x).
- NativeWind 4 needs Tailwind CSS 3, so `apps/mobile` uses `tailwindcss@3` while
  `apps/web` uses Tailwind 4. NativeWind 5 (Tailwind 4) is still a release
  candidate.
- In `apps/mobile`, add packages with `npx expo install <package>` to get
  SDK-compatible versions.
- `apps/mobile` stays on the Expo SDK supported by Expo Go in the stores (57),
  with its own React version (19.2.3; the web uses the catalog's). To upgrade,
  once Expo Go supports it: `npx expo install expo@^58 && npx expo install --fix`.
