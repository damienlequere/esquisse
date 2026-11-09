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
pnpm generate-game <game> "brief" [--model <id>]  # a new game, its plan then its scenes' backgrounds, kept in its game.json (see A new game)
pnpm generate-scene <game> <id> portrait|landscape "brief"  # a new scene of a game, its background only (see Generating a scene)
pnpm remove-scene <game> <id> # removes a scene, its texts and its images
pnpm remove-game <game> # removes a game, all its scenes and its items
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

## Capsules

A scene can be shown on another site, where this line is put:

```html
<script
  src="https://<the site>/capsule.js"
  data-scene="tristram/rue"
  data-title="Tristram, à la tombée du soir"
  async
></script>
```

`data-scene` is `<game>/<id>`; `data-size`, the square's side in px, is 350 unless
said; `data-title` names the iframe for screen readers.

It first shows as a square, in the page, with rounded corners, the
scene cropped to fill it. The icon in its corner spreads it over the whole page,
above its menus and whatever contains the square, framed in the middle as on this
site, with the same sizes (`#device` in `globals.css`): on a phone, the whole
screen. The square grows into the frame, from where it is, as the site's background color
(its `body`'s, or its `html`'s) fades in over the page, around the frame (at once
for whom asks for less motion). The same icon, Escape, or a press
around the frame takes it back. The scene is not loaded again.

`public/capsule.js` makes this: an iframe of `/embed/<game>/<id>`, in a dialog
shown as modal, which goes above the page without moving in it, and which tells
`components/Capsule.tsx` where the square is, by `postMessage`; the capsule draws
the rest. A site with a Content Security Policy must allow this site in
`script-src` and `frame-src`. In an iframe alone, a capsule is a square without
its icon.

A capsule is only looked at: no opening, no ring menu, no clickable object, no
character (`capsuleGame` in `packages/engine`). Its animations play. Any site may
embed one. It is the deployed scene, not a copy: it changes with each deploy.

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

- **The background is written by Claude** (Opus 5.5) from a brief: the title,
  the intro, the style, the light and the decor, painted by Gemini. The objects,
  the characters, their texts and dialogues are written by hand.
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
- **The objects are zones of the background** (`objects.json`), checked
  against the safe zone.
- **The characters are layers**, placed by their feet (`anchor`) at a given
  height, so they can come and go without changing the background.
- Everything placed on the image is in % of the image, so it follows the cropping.

| File | Role |
| --- | --- |
| `content/games/<game>/scenes/<id>/scene.json` | The scene: safe zone, prompts, positions, texts and dialogues |
| `content/games/<game>/scenes/<id>/objects.json`, `characters.json` | The objects' boxes, the layers' proportions |
| `content/games/<game>/scenes/<id>/*.webp` | Converted images, for both apps |
| `content/games/<game>/scenes/<id>/sources/` | Original images, never bundled |
| `content/games/<game>/items/index.ts`, `items/<id>.webp` | The game's items (`ITEMS`): their names, their images |
| `content/games/index.ts` | The games, with their scenes and items, for both apps (generated) |
| `content/games/images.ts` | The games' images, for both apps (generated): Next and Metro each need every import spelled out, and each makes it what it shows |
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
  "start": "rue",
  "links": { "rue": { "auberge": "auberge" }, "auberge": { "rue": "rue" } }
}
```

A game may also keep, in `"brief"`, the text its scenes were asked for, in its
author's words, as each scene keeps its own, and, in `"generation"`, how they
were first generated (see A new game); neither app shows them.

A scene can also offer a way back: `"back": "rue"` in its `scene.json` names an
exit, linked like the others, taken by the back button, a return arrow in the
bottom left corner of the frame, shown only where the game links it.

An exit the game does not link, as every exit of a scene played alone at
`/game/<game>/scene/<id>`, stays closed: the action does what it would without
`exit` (its text, or a search). A game is played at `/game/<game>` on the web
site, and from the home screen in both apps, which lists each game, then each of
its scenes, to play alone. It is listed once its first scene is.

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
  ✗ rue: no exit « cave » to link to « cave » (an action's exit, or back)
  ⚠ auberge: the exit « rue » (the back button) is not linked: it stays closed
```
| `packages/generator/src/generate-scene.ts` | The background, written, painted, validated, saved and listed for both apps |
| `packages/generator/src/generate-game.ts` | A new game: its plan, then each of its scenes as generate-scene makes one, kept in its `game.json` |
| `packages/generator/src/write-game.ts`, `session.ts` | The game's plan with Claude; what both commands share (the questions, a background painted until validated, saved) |
| `packages/generator/src/write-scene.ts`, `paint.ts`, `registry.ts` | The writing with Claude, the image with Gemini and the renders, the generated lists |

## Generating a scene

A scene's background is made in the terminal, from a short description (the
brief): Claude writes it, Gemini paints it, you validate it on the render, and
it shows up in both apps.

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

### A new game

```bash
pnpm generate-game <game> "<brief>" [--model <id>]
```

The brief says what the whole game is about, and may fix its scenes: how many,
their names, their orientations, what each shows or does not, which ones open on
their title. Claude writes the plan: the game's title, one style for all its
images, and its scenes, each with its id, its orientation, its opening and its
own brief. Then `v` validate, `m` describe a change, `q` quit.

`--model` chooses the Claude model that writes the plan and every scene, for
the whole run: `claude-opus-5-5` by default, or another id the API knows, such
as `claude-fable-5-1`, `claude-sonnet-5-5` or `claude-haiku-5-5`. It is checked
before anything is paid for (an unknown id lists those the API knows), and kept
in `generation.textModel`. A refused request goes to another model by itself
only on Fable 5.1, Opus 5.5, Opus 5 and Sonnet 5.5. `pnpm generate-scene`
always writes with `claude-opus-5-5`.

Each scene is then made as `pnpm generate-scene` makes one, from its brief,
written within the game (Claude reads the game's brief, and the style is the
plan's, the same for every scene), and saved once validated. The game starts
in the first scene; its scenes are not linked.

```text
$ pnpm generate-game tristram4 "un village rappelant Tristram à la tombée du soir…"
Writing with claude-opus-5-5…

Tristram
Style : Matte painting numérique de cinéma…

1. rue (portrait, avec ouverture) : une rue montante…
2. place-du-village (landscape) : la place ronde…
Le plan :  [v] valider  [m] modifier  [q] quitter
> v
New game "tristram4", starting in "rue": content/games/tristram4/game.json

── 1/2 : rue (portrait)
…
```

The game's `game.json` keeps how it was generated, once, in `"generation"`:
the command, the date, the models, the changes asked to the plan, and for each
scene its plan, then, once validated, its title, intro, style, light and
background, with the changes asked to it. Gemini got, one per line, the style,
the background and `Format portrait.` or `Format paysage.`. It never changes
after: the scenes' `scene.json` do. Quitting keeps the scenes validated; the
others stay in the plan, to make with `pnpm generate-scene`.

The game must not exist: `pnpm remove-game` first. Each plan and each change to
it is one Claude request, on top of the scenes'.

### A new scene

```bash
pnpm generate-scene <game> <id> portrait|landscape "<brief>"
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
pnpm generate-scene bois foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
```

Claude (Opus 5.5) writes the title, the intro, the style, the light and the
decor, and Gemini (Nano Banana 2.1) paints the background, empty. The render is
saved in the system's temporary folder and opens in the image viewer, with the
safe zone dashed. Then: `v` validate, `r` paint it again, `m` describe a change
(Claude rewrites the decor, Gemini repaints it), `q` quit.

```text
$ pnpm generate-scene bois foret portrait "l'orée d'une forêt au crépuscule, un bivouac abandonné"
New game "bois", starting in "foret": its title is in content/games/bois/game.json
Writing with claude-opus-5-5…

Le bivouac abandonné
Tu sors du couvert des arbres…

Painting the background…
  Render: /tmp/esquisse-bois-foret-1.jpg
Le fond :  [v] valider  [r] repeindre  [m] modifier  [q] quitter
> v
✓ Saved: /game/bois/scene/foret in both apps
✓ Le bivouac abandonné: /game/bois/scene/foret, run pnpm dev to see it
```

What is validated is saved (`scene.json`, an empty `objects.json` and
`characters.json`, `fond.webp`, the original in `sources/fond.jpg`) and the scene
is listed for both apps (`content/games/index.ts`, `content/games/images.ts`).

The objects, the characters and the animations are not generated: they are
written in `scene.json` (and the objects' boxes in `objects.json`) by hand.
`pnpm show-scene` shows where they fall on the background.

Running it again on an existing scene asks, then deletes it and starts over.
Its new brief, title, intro, style, light and background are in its
`scene.json`; the game's `"generation"` keeps the first ones.

In a game made by `pnpm generate-game` (its `game.json` keeps its brief, and its
`"generation"` one style for all its scenes), the scene is written within the
game, as there: Claude reads the game's brief and the style is the game's, kept
as it is. A scene painted again keeps whether it has an opening (`"opening":
false` in its `scene.json`), and a scene of the plan not made yet takes the
plan's.

Each painting calls the APIs, which are paid: one Claude request per writing
or change, one Gemini request per painting.

### Removing a scene

```bash
pnpm remove-scene <game> <id>
```

It deletes the scene's folder (`content/games/<game>/scenes/<id>/`), after
asking (`--yes` skips the question), then lists the remaining scenes for both
apps. Its game may still name it: `pnpm check-game <game>` says where.

### Removing a game

```bash
pnpm remove-game <game>
```

It deletes the game's folder (`content/games/<game>/`), with all its scenes and
its items, after asking (`--yes` skips the question), then lists the remaining
games for both apps.

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
