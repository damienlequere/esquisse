# Esquisse

Clickable illustrated scenes: a web site and mobile apps (iOS, Android).

```
apps/
  web/       Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
  mobile/    Expo SDK 57 (React Native 0.86) + Expo Router + NativeWind 4
packages/
  shared/    Plain TypeScript shared by both apps (@esquisse/shared)
  generator/ Node scripts that write and paint the scenes (@esquisse/generator)
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
pnpm generate <id> "brief"  # a new scene (see Clickable scenes)
pnpm remove-scene <id> # removes a scene, its texts and its images
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

- **The scene is written by Claude** (Opus 5.5) from a brief: the texts, the
  dialogues, the prompts for the images and the composition. The script checks
  the composition (`packages/generator/src/check-scene.ts`) and sends what does not hold back to
  the model, up to three times.
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
| `packages/shared/src/scenes/index.ts` | The scenes, for both apps (`scenes.phare`), and their types (generated) |
| `packages/generator/sources/<id>/` | Original images and the composition guide |
| `packages/shared/assets/scenes/<id>/` | Converted images, for both apps |
| `apps/web/scenes.ts`, `apps/mobile/src/scenes.ts` | Each app's list of the images (generated): Next and Metro each need every import spelled out |
| `apps/web/components/Scene.tsx`, `apps/mobile/src/components/Scene.tsx` | The scene, in each app |
| `packages/generator/src/generate-scene.ts` | Writes the scene, generates the background, detects the objects, generates and keys the characters, lists the scene for both apps |
| `packages/generator/src/write-scene.ts`, `check-scene.ts`, `registry.ts` | The scene's writing with Claude, its checks, the generated lists |

## Generating a scene

A scene is made by one command, from a short description (the brief): Claude
writes it, Gemini paints it, and it shows up in both apps.

### Once: the API keys

The generator needs two keys, as environment variables: `ANTHROPIC_API_KEY`
([Claude Console](https://platform.claude.com/), to write the scene) and
`GEMINI_API_KEY` ([Google AI Studio](https://aistudio.google.com/apikey), for
the images).

```bash
cp packages/generator/.env.example packages/generator/.env.local
# then fill in both keys in packages/generator/.env.local
```

`packages/generator/.env` works too. A variable set in the shell wins over
`.env.local`, which wins over `.env`. Both files are ignored by git; never put
keys in `.env.example`, which is committed. The scripts are TypeScript, run by
Node as they are (`--experimental-strip-types`, from Node 22.6).

### A new scene

```bash
pnpm generate <id> "<brief>"
```

- **`<id>`** is the scene's name in the code and its URL (`/scene/<id>`):
  lowercase letters, digits and dashes, like `marche` or `cave-a-vin`.
- **`<brief>`**, in quotes, says what the scene is about. It can be just a theme,
  or pin things down: how many objects (1 to 4) or characters (0 to 3), who they
  are, the tone, the place, the era, the style. Claude follows what it pins and
  invents the rest (by default, 3 objects and 2 characters).

```bash
pnpm generate marche "un marché de nuit à Marrakech, une épice volée"
pnpm generate cave "une cave à vin bourguignonne, 2 objets, 1 vigneron bourru, ton comique"
```

It runs without stopping, in four steps, and takes a few minutes:

| Step | What it does | What it writes |
| --- | --- | --- |
| `ecriture` | Claude (Opus 5.5) writes the scene from the brief: title, intro, style, objects and their texts, characters and their dialogues, where everything goes. The composition is checked and sent back to fix, up to three times. | `packages/shared/src/scenes/<id>/scene.json` |
| `fond` | Gemini (Nano Banana 2.1) paints the background, following a composition guide drawn from the positions. | `packages/generator/sources/<id>/guide.png`, `fond.jpg`; `packages/shared/assets/scenes/<id>/fond.webp` |
| `reperage` | Gemini in vision finds where each object really is in the background. | `packages/shared/src/scenes/<id>/objects.json` |
| `personnages` | Gemini paints each character on green, matching the background, then the green is keyed out. | `packages/generator/sources/<id>/<character>.jpg`; `packages/shared/assets/scenes/<id>/<character>.webp`, `characters.json` |

Then the scene is listed for both apps (`packages/shared/src/scenes/index.ts`,
`apps/web/scenes.ts`, `apps/mobile/src/scenes.ts`): run `pnpm dev`, it is on the
home page and at `/scene/<id>`.

### Checking and redoing

- **Look at the scene**, and read `scene.json`: everything in it can be edited
  by hand (a text, a dialogue, a prompt, a position).
- **Run again without a brief** to do only what is missing, for instance after
  a failure: `pnpm generate <id>`.
- **Name a step to redo it**, with everything that follows from it:
  `pnpm generate <id> fond` paints a new background, then finds the objects and
  paints the characters again. `reperage` or `personnages` redo only that step.
  `ecriture` rewrites the scene from its brief, kept in `scene.json`.
- **A new brief rewrites the scene**, and redoes all its images, even if the
  scene already exists.
- **A scene edited by hand is checked** before any image is generated; the
  problems are printed.

When something goes wrong:

- *"The composition still does not hold"*: after three rounds, Claude's positions
  still break the rules. `scene.json` is saved: fix the listed positions by hand,
  then run `pnpm generate <id>`.
- *"⚠ <object>: outside the safe zone"* or *"not found"* after `reperage`: the
  background did not put the object where planned. Run
  `pnpm generate <id> fond` for a new one.
- *A character looks wrong*: `pnpm generate <id> personnages`.

Each run calls the APIs, which are paid: writing is one to three Claude
requests, and the images are one Gemini request for the background, one for
the objects and one per character.

### Removing a scene

```bash
pnpm remove-scene <id>
```

It deletes the scene's three folders (`packages/shared/src/scenes/<id>/`,
`packages/shared/assets/scenes/<id>/`, `packages/generator/sources/<id>/`),
after asking (`--yes` skips the question), then lists the remaining scenes for
both apps.

### Committing

Commit the scene's folders (`packages/shared/src/scenes/<id>/`,
`packages/shared/assets/scenes/<id>/`, `packages/generator/sources/<id>/`) with
the three lists, which are written by the generator and never edited by hand.

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
