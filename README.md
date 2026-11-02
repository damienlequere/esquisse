# Esquisse

Clickable illustrated scenes: a web site and mobile apps (iOS, Android).

```
apps/
  web/       Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
  mobile/    Expo SDK 57 (React Native 0.86) + Expo Router + NativeWind 4
packages/
  engine/    Plain TypeScript shared by both apps: how a scene and a game are played (@esquisse/engine)
  generator/ Node scripts that write and paint the scenes, and check the games (@esquisse/generator)
content/     The games (@esquisse/content)
  games/<game>/
    game.json      its title, its first scene, where each scene's exits lead
    scenes/<id>/   a scene: its JSON, its images, their originals in sources/
    items/         its items (ITEMS) and their images, their originals in sources/
```

The code never names a game nor a scene: the content is data that the apps
import and the generator writes. A game is one folder, all it needs in it.

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
pnpm dev             # web site: http://localhost:3000 (a game: /game/tristram, a scene alone: /game/tristram/scene/auberge)
pnpm dev:mobile      # Expo dev server: scan the QR code with Expo Go
pnpm dev:all         # both, through Turborepo
pnpm build           # production builds
pnpm typecheck
pnpm lint            # pnpm format to fix
pnpm generate <game> <id> portrait|landscape "brief"  # a new scene of a game, built step by step (see Generating a scene)
pnpm remove-scene <game> <id> # removes a scene, its texts and its images
pnpm show-scene <game> <id> # the scene's background with what is clickable outlined, in the image viewer
pnpm check-game [<id>] # checks a game's links, exits and flags against its scenes (every game without an id)
pnpm loc             # lines of code per app and package (source / tests)
pnpm deploy:preview  # lint, typecheck, check the games, then deploy the web site to a Vercel preview URL
pnpm deploy:prod     # same, to production
```

## Deploying the web site (Vercel)

Once, from the repository root: `vercel link`, to create or pick the Vercel
project, then in its settings set **Root Directory** to `apps/web` (Vercel
installs the whole pnpm workspace, so `@esquisse/engine` is found). The deploy
scripts then upload from the root. The region is set in `apps/web/vercel.json`
(`fra1`, Paris).

The scripts are not named `deploy`: `pnpm deploy` is a built-in pnpm command.

## Clickable scenes

Each scene of a game, played alone at `/game/<game>/scene/<id>` on the web site, or in its game, and in the mobile app, is a
clickable scene, ported from protagonist's `prototypes/scene-cliquable`: the
place's image fills the frame, each object is a clickable part of the image,
which opens a menu of its actions next to where it was clicked, and is slightly
overexposed while it is open (not when pointed at) (`actions` in `scene.json`; without them, its
`label` and `text` are its only action; an action with `search` shows
instead what the object holds, `contents`, up to nine items listed in its game's `ITEMS`
(`content/games/<game>/items`), each of which goes to the inventory when pressed), and the characters, clickable too, open
a dialogue. An action's text goes to the text panel, which it does not open. On the web, the frame adapts to the screen (see The device frame); in the mobile app, the scene takes the whole screen. A scene opens
on its title, in the middle, on black; its intro fades in under it, and once it
has had time to be read (35 ms per character), an arrow to enter fades in, in
the bottom right corner of the frame; the scene waits for it to be pressed, then both fade out to show the
scene. It cannot be skipped. On the web, while a touch screen asks to be turned, it
waits, and starts over if the screen is turned away before its end. In a game, it
plays on a scene's first visit only. A scene with `"opening": false` in its
`scene.json` has none: it shows at once, its intro going only to the logbook.

- **The scene is written by Claude** (Opus 5.5) from a brief: the texts, the
  dialogues, the prompts for the images and the composition. The script checks
  the composition (`packages/generator/src/check-scene.ts`) and sends what does not hold back to
  the model, up to three times.
- **The image is portrait (9:16) or landscape (16:9)**, chosen per scene
  (`imageRatio` in `scene.json`), in `cover`. In portrait, a phone crops its
  sides (9% each), a tablet its top and bottom (12.5% each), and the text is a
  band at the bottom, 22% of the height. In both orientations, the text has a
  border, and a tab on it folds the text, to see the whole image; only the tabs
  open it again. It starts folded: the scene's intro waits for the tab. In landscape, the screen is turned: a phone crops the top and bottom (9% each), a tablet the sides (12.5% each), and
  the text is a panel on the right, 16rem wide but never more than 30% of the
  screen, the whole height; a conversation opens in it too. What stays
  visible everywhere, minus a margin, is the **safe zone** (`safe` in
  `scene.json`): `{0.09, 0.14, 0.91, 0.86}` in portrait,
  `{0.14, 0.14, 0.86, 0.86}` in landscape. The text no longer takes part of it.
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
| `content/games/<game>/scenes/<id>/scene.json` | The scene: safe zone, prompts, positions, texts and dialogues |
| `content/games/<game>/scenes/<id>/objects.json`, `characters.json` | Detected boxes, layers' proportions (generated) |
| `content/games/<game>/scenes/<id>/*.webp` | Converted images, for both apps |
| `content/games/<game>/scenes/<id>/sources/` | Original images, never bundled |
| `content/games/<game>/items/index.ts`, `items/<id>.webp` | The game's items (`ITEMS`): their names, their images |
| `content/games/index.ts` | The games, with their scenes and items, for both apps (generated) |
| `apps/web/images.ts`, `apps/mobile/src/images.ts` | Each app's list of the games' images (generated): Next and Metro each need every import spelled out |
| `apps/web/components/Scene.tsx`, `apps/mobile/src/components/Scene.tsx` | The scene, in each app |
| `content/games/<game>/game.json` | A game: its first scene, and its scenes' links (written by hand) |
| `packages/engine/src/scenes/play.ts` | How a game is played (`playGame`), the same in both apps |
| `apps/web/components/Game.tsx`, `apps/mobile/src/components/Game.tsx` | A game, from scene to scene, in each app; a scene alone is a game of its own |

## Games

A game links scenes, each one still generated and adjusted alone. A scene
declares its **exits**: an object's action with `exit` (`{ "label": "Entrer",
"exit": "auberge" }`), a name of its own. The game, in
`content/games/<game>/game.json`, says where each one leads:

```json
{
  "title": "Tristram",
  "start": "tristram",
  "links": { "tristram": { "auberge": "auberge" }, "auberge": { "rue": "tristram" } }
}
```

A scene can also offer a way back: `"back": "rue"` in its `scene.json` names an
exit, linked like the others, taken by the back button, a return arrow in the
bottom left corner of the frame, shown only where the game links it.

An exit the game does not link, as every exit of a scene played alone at
`/game/<game>/scene/<id>`, stays closed: the action does what it would without
`exit` (its text, or a search). A game is played at `/game/<game>` on the web
site, and from the home screen in both apps, which lists the games only (a
scene alone has no link there). It is listed once its first scene is.

What the player keeps from scene to scene is the game's (`GameProgress` in
`play.ts`): the inventory, the logbook (each scene's intro, on its first
visit), the **flags**, and each visited scene as it was left (what its objects
still hold). An action with `sets` raises a flag; one with `requires` is offered
only once it is raised, and an object left with no action is not clickable. A
scene comes back without its opening.

`pnpm check-game [<id>]` checks a game against its scenes, as they are on disk,
without calling an API (`packages/generator/src/check-game.ts`). Errors, which
make it fail (and stop a deploy): a `game.json` badly shaped, a scene it names
that is not in its `scenes/` or not complete (so the apps do not list it), a
link from an exit its scene does not have, a flag required that nothing in the
game raises, an item an object holds that the game's items do not list.
Warnings: an exit left closed, a scene no exit leads to from the first, a scene
no link names (only played alone), a flag raised that nothing requires. Run it after writing a
`game.json`, and after changing or removing a scene a game goes through.

```text
$ pnpm check-game
✗ tristram
  ✗ tristram: no exit « cave » to link to « cave » (an action's exit, or back)
  ⚠ auberge: the exit « rue » (the back button) is not linked: it stays closed
```
| `packages/generator/src/generate-scene.ts` | The session: the background, then each element, then each character's dialogue line by line, validated one at a time, saved and listed for both apps |
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
pnpm generate <game> <id> portrait|landscape "<brief>"
```

- **`<game>`** is the game the scene belongs to, its folder in
  `content/games` and its URL (`/game/<game>`). A game that does not exist yet
  is made with it: its `game.json` starts in this scene, its title is the
  game's id until written by hand.
- **`<id>`** is the scene's name in the game and its URL
  (`/game/<game>/scene/<id>`): lowercase letters, digits and dashes, like
  `marche` or `cave-a-vin`, as the game's.
- **`portrait`** or **`landscape`** is the image's orientation, 9:16 or 16:9,
  fixed for the scene's life.
- **`<brief>`**, in quotes, says what the scene is about: the place, the era,
  the tone, what you want to see. Claude follows what it pins and invents the
  rest.

```bash
pnpm generate bois foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
```

The session goes in four stages. Each render is saved in the system's temporary
folder and opens in the image viewer, with the safe zone dashed, the objects
outlined in orange and the characters in blue.

1. **The background.** Claude (Opus 5.5) writes the title, the intro, the style,
   the light and the decor, and Gemini (Nano Banana 2.1) paints it, empty. Then:
   `v` validate, `r` paint it again, `m` describe a change (Claude rewrites the
   decor, Gemini repaints it), `q` quit.
2. **The details, for realism.** Claude looks at the validated background and
   suggests 4 to 6 small details that make the place credible and lived in
   (wear, moss, puddles, cobwebs, smoke, distant birds), kept discreet, off the
   floor and away from what is clickable. Each has a zone, which must lie in the
   safe zone: one outside is sent back to Claude, up to three times, then
   dropped. Type their numbers (`1 3 4`), `tous`, or describe your own (Claude
   places them the same way); Enter skips. Gemini retouches them all into the
   background at once; they are never clickable, and are listed in
   `background.details`. Then: `v` validate, `r` redo, `m` describe a change
   (Claude rewrites the kept details), `a` drop them. Each retouch degrades the
   image a little, so this pass is best done before the objects; `d` at the
   question of the next stage runs it again.
3. **The elements, one at a time.** Claude suggests a few ideas; type one's
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
4. **A character's dialogue, one line at a time**, right after the character is
   validated. Claude writes its greeting; then, as many times as you want, a
   question the player can ask and its answer (type the question you want, or
   `n` for Claude to suggest one; Enter when there are enough); then its
   farewell. Each line is shown before the next: `v` validate, `r` rewrite it,
   `m` describe a change, `a` drop it (for the greeting and the farewell, keep
   it for later). Each validated line is saved at once. `p`, at the question of
   the elements, goes back to a character's dialogue: it asks for what it still
   lacks, and more questions.

A session looks like this (Claude's texts shortened):

```text
$ pnpm generate bois foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
New game "bois", starting in "foret": its title is in content/games/bois/game.json
Writing with claude-opus-5-5…

Le bivouac abandonné
Tu sors du couvert des arbres…

Painting the background…
  Render: /tmp/esquisse-bois-foret-1.jpg
Le fond :  [v] valider  [r] repeindre  [m] modifier  [q] quitter
> v
✓ Saved: /game/bois/scene/foret in both apps
Writing with claude-opus-5-5…

Détails de réalisme :
  1. de la mousse sur les racines au pied du grand chêne, à gauche
     de 10 % à 30 % de la largeur, de 58 % à 68 % de la hauteur
  2. une fine brume entre les troncs, au fond
     de 20 % à 85 % de la largeur, de 30 % à 45 % de la hauteur
  …
Lesquels ajouter ? (des numéros, « tous », une description, ou Entrée pour passer)
> 1 2

Les détails : …

Adding the details to the background…
  Render: /tmp/esquisse-bois-foret-2.jpg
Les détails :  [v] valider  [r] refaire  [m] modifier  [a] abandonner
> v
✓ Saved: /game/bois/scene/foret in both apps

Idées :
  1. un feu de camp au premier plan
  2. un cheval attaché entre les arbres
Que veux-tu ajouter ? (une description, un numéro d'idée, d pour des détails de réalisme, ou Entrée pour finir)
> 1
Writing with claude-opus-5-5…

Objet « feu-de-camp », de 55 % à 88 % de la largeur, de 58 % à 70 % de la hauteur
Adding feu-de-camp to the background…
Detecting the objects…
  Render: /tmp/esquisse-bois-foret-3.jpg
« feu-de-camp » :  [v] valider  [r] refaire  [m] modifier  [a] abandonner
> m
Que changer ?
> plus petit, et à gauche
…
> v
✓ Saved: /game/bois/scene/foret in both apps
Que veux-tu ajouter ? (une description, un numéro d'idée, d pour des détails de réalisme, ou Entrée pour finir)
>
✓ Le bivouac abandonné: /game/bois/scene/foret, run pnpm dev to play it
```

What is validated is saved at once (`scene.json`, `objects.json`,
`characters.json`, the images) and the scene is listed for both apps
(`content/games/index.ts`, `apps/web/images.ts`,
`apps/mobile/src/images.ts`): the session can stop at any time, and `pnpm dev`
shows the scene at `/game/<game>/scene/<id>`, and in its game once its first
scene is complete.

| What | Where |
| --- | --- |
| The scene, its texts and the positions | `content/games/<game>/scenes/<id>/scene.json`, `objects.json`, `characters.json` |
| The converted images | `content/games/<game>/scenes/<id>/fond.webp`, `<character>.webp` |
| The originals | `content/games/<game>/scenes/<id>/sources/fond.jpg`, `<character>.jpg` |

### Going on, starting over

- **Add to a scene** later: `pnpm generate <game> <id>`, without a brief, shows the
  current render and asks what to add, or `p` for a character's dialogue.
- **Start over**: `pnpm generate <game> <id> portrait|landscape "<brief>"` on an existing scene asks, then
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
change (a dialogue's line, its rewriting or its change included) (more if the composition is sent back), one Gemini request per painting
or retouch, and one per detection after an object or after details on a scene
that has objects.

### Removing a scene

```bash
pnpm remove-scene <game> <id>
```

It deletes the scene's folder (`content/games/<game>/scenes/<id>/`), after
asking (`--yes` skips the question), then lists the remaining scenes for both
apps. Its game may still name it: `pnpm check-game <game>` says where.

### Committing

Commit the scene's folder (`content/games/<game>/scenes/<id>/`), and its game's
`game.json` when it is new, with the three lists, which are written by the
generator and never edited by hand.

## The device frame (web)

The scenes are shown in a device frame: on a large screen with a mouse, a
phone (9:19.5), or a tablet (3:4) from 1024 px wide; on a phone or a touch
tablet, the whole screen. Everything lives in two places:

- `apps/web/components/SceneFrame.tsx`: the `#stage` and `#device` elements,
  turned like the scene being played;
- `apps/web/app/globals.css`: their styles, under a media query.

Each scene of a game gets its own frame, which waits for its images. Dialogs
and menus must open in `#device` (positioned), not on `body`.

## Notes

- Mobile TypeScript stays on the version Expo expects (`~6.0.3`); web, engine and content
  use the catalog's (7.x).
- NativeWind 4 needs Tailwind CSS 3, so `apps/mobile` uses `tailwindcss@3` while
  `apps/web` uses Tailwind 4. NativeWind 5 (Tailwind 4) is still a release
  candidate.
- In `apps/mobile`, add packages with `npx expo install <package>` to get
  SDK-compatible versions.
- `apps/mobile` stays on the Expo SDK supported by Expo Go in the stores (57),
  with its own React version (19.2.3; the web uses the catalog's). To upgrade,
  once Expo Go supports it: `npx expo install expo@^58 && npx expo install --fix`.
