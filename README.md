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
pnpm generate <id> portrait|landscape "brief"  # a new scene, built step by step (see Generating a scene)
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
`app/scene/`; in the mobile app, the scene takes the whole screen. A scene opens
on its title, in the middle, over its background blurred and desaturated, which
then fades out with the title to show the scene; a tap skips it.

- **The scene is written by Claude** (Opus 5.5) from a brief: the texts, the
  dialogues, the prompts for the images and the composition. The script checks
  the composition (`packages/generator/src/check-scene.ts`) and sends what does not hold back to
  the model, up to three times.
- **The image is portrait (9:16) or landscape (16:9)**, chosen per scene
  (`imageRatio` in `scene.json`), in `cover`. In portrait, a phone crops its
  sides (9% each), a tablet its top and bottom (12.5% each), and the text is a
  band at the bottom, 22% of the height. In both orientations, the text has a
  border, and a tab on it folds the text, to see the whole image, until the
  next text. It starts folded: the scene's intro waits for the tab. In landscape, the screen is turned: a phone crops the top and bottom (9% each), a tablet the sides (12.5% each), and
  the text is a panel on the right, 16rem wide but never more than 30% of the
  screen, the whole height; a conversation opens in it too. What stays
  visible everywhere, minus a margin at the top and the text, is the **safe zone**
  (`safe` in `scene.json`): `{0.09, 0.14, 0.91, 0.71}` in portrait,
  `{0.14, 0.22, 0.68, 0.86}` in landscape, where the decor that matters is in
  the left two thirds.
- **The screen turns like the scene.** The mobile app locks each scene's screen
  to its orientation (the home screen stays portrait). The web site cannot turn a
  phone: on a touch screen held the other way, the scene asks to turn it. On a
  computer, the device frame is portrait or landscape.
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
| `packages/generator/src/generate-scene.ts` | The session: the background, then each element, validated one at a time, saved and listed for both apps |
| `packages/generator/src/write-scene.ts`, `paint.ts`, `check-scene.ts`, `registry.ts` | The writing with Claude, the images with Gemini and the renders, the checks, the generated lists |

## Generating a scene

A scene is built step by step, in the terminal, from a short description (the
brief): Claude writes it, Gemini paints it, you validate each step on the
render, and it shows up in both apps.

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
pnpm generate <id> portrait|landscape "<brief>"
```

- **`<id>`** is the scene's name in the code and its URL (`/scene/<id>`):
  lowercase letters, digits and dashes, like `marche` or `cave-a-vin`.
- **`portrait`** or **`landscape`** is the image's orientation, 9:16 or 16:9,
  fixed for the scene's life.
- **`<brief>`**, in quotes, says what the scene is about: the place, the era,
  the tone, what you want to see. Claude follows what it pins and invents the
  rest.

```bash
pnpm generate foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
```

The session goes in two stages. Each render is saved in the system's temporary
folder and opens in the image viewer, with the safe zone dashed, the objects
outlined in orange and the characters in blue.

1. **The background.** Claude (Opus 5.5) writes the title, the intro, the style,
   the light and the decor, and Gemini (Nano Banana 2.1) paints it, empty. Then:
   `v` validate, `r` paint it again, `m` describe a change (Claude rewrites the
   decor, Gemini repaints it), `q` quit.
2. **The elements, one at a time.** Claude suggests a few ideas; type one's
   number, or describe what to add (`un cheval à l'arrière-plan`, `une vieille
   gardienne près de la porte`). Claude writes the element from the current
   render: an object (something clickable that shows a text) or a character
   (someone to talk to). Its position is checked and sent back to fix, up to
   three times.
   - An **object** is painted into the background by retouching the validated
     one, then every object is found again in the image (the retouch can move
     them a little).
   - A **character** is painted on green, matching the background, and the
     green is keyed out; the layer is placed by its feet.

   Then: `v` validate, `r` redo it (an object is retouched again from the
   validated background, never from a rejected one), `m` describe a change, `a`
   drop it. Press Enter at the question to finish.

A session looks like this (Claude's texts shortened):

```text
$ pnpm generate foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
Writing with claude-opus-5-5…

Le bivouac abandonné
Tu sors du couvert des arbres…

Painting the background…
  Render: /tmp/esquisse-foret-1.jpg
Le fond :  [v] valider  [r] repeindre  [m] modifier  [q] quitter
> v
✓ Saved: /scene/foret in both apps

Idées :
  1. un feu de camp au premier plan
  2. un cheval attaché entre les arbres
Que veux-tu ajouter ? (une description, un numéro d'idée, ou Entrée pour finir)
> 1
Writing with claude-opus-5-5…

Objet « feu-de-camp », de 55 % à 88 % de la largeur, de 58 % à 70 % de la hauteur
Adding feu-de-camp to the background…
Detecting the objects…
  Render: /tmp/esquisse-foret-2.jpg
« feu-de-camp » :  [v] valider  [r] refaire  [m] modifier  [a] abandonner
> m
Que changer ?
> plus petit, et à gauche
…
> v
✓ Saved: /scene/foret in both apps
Que veux-tu ajouter ? (une description, un numéro d'idée, ou Entrée pour finir)
>
✓ Le bivouac abandonné: /scene/foret, run pnpm dev to play it
```

What is validated is saved at once (`scene.json`, `objects.json`,
`characters.json`, the images) and the scene is listed for both apps
(`packages/shared/src/scenes/index.ts`, `apps/web/scenes.ts`,
`apps/mobile/src/scenes.ts`): the session can stop at any time, and `pnpm dev`
shows the scene on the home page and at `/scene/<id>`.

| What | Where |
| --- | --- |
| The scene, its texts and the positions | `packages/shared/src/scenes/<id>/scene.json`, `objects.json`, `characters.json` |
| The originals | `packages/generator/sources/<id>/fond.jpg`, `<character>.jpg` |
| The converted images | `packages/shared/assets/scenes/<id>/fond.webp`, `<character>.webp` |

### Going on, starting over

- **Add to a scene** later: `pnpm generate <id>`, without a brief, shows the
  current render and asks what to add.
- **Start over**: `pnpm generate <id> portrait|landscape "<brief>"` on an existing scene asks, then
  deletes it and starts again from the background.
- **Edit by hand**: everything in `scene.json` can be changed (a text, a
  dialogue, a prompt); a position changed by hand is not repainted.

When something goes wrong:

- *"The composition still does not hold"*: after three rounds, Claude's position
  still breaks the rules. The element is shown anyway: `m` to ask for another
  place, or `a` to drop it.
- *"⚠ <object>: outside the safe zone"* or *"not found"*: the retouch did not
  put the object where planned. `r` to retouch again.

Each step calls the APIs, which are paid: one Claude request per writing or
change (more if the composition is sent back), one Gemini request per painting
or retouch, and one per detection after an object.

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
