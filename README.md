# Esquisse

Clickable illustrated scenes: a web site and mobile apps (iOS, Android).

```
apps/
  web/       Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
  mobile/    Expo SDK 58 (React Native 0.88) + Expo Router + NativeWind 4
  studio/    Next.js 16: the studio, to build games and scenes in the browser, on this machine (see The studio)
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
pnpm mobile:login  # an Expo account, for the builds and updates on Expo's servers (see Testing the mobile app)
```

## Commands

```bash
pnpm install
pnpm dev             # web site: http://localhost:3000 (a game: /game/tristram, a scene alone: /game/tristram/scene/auberge)
pnpm dev:mobile      # Expo dev server: scan the QR code with Expo Go
pnpm dev:studio      # the studio: http://localhost:3100 (see The studio)
pnpm dev:all         # all three, through Turborepo
pnpm build           # production builds
pnpm typecheck
pnpm lint            # pnpm format to fix
pnpm generate-game <game> "brief" [--model <id>] [--art <id>|"direction"]  # a new game, its plan then its scenes' backgrounds, kept in its game.json (see A new game)
pnpm generate-scene <game> <id> portrait|landscape "brief" [--art <id>|"direction"]  # a new scene of a game, its background only (see Generating a scene)
pnpm link-game <game>  # links a game made by pnpm generate-game, from its plan: its exits found in its scenes, its links (see Linking a game)
pnpm generate-night <game> [<scene>…]  # each scene's night, painted from its background (see A game's night)
pnpm remove-scene <game> <id> # removes a scene, its texts and its images
pnpm remove-game <game> # removes a game, all its scenes and its items
pnpm show-scene <game> <id> # the scene's background with what is clickable outlined, in the image viewer
pnpm check-game [<id>] # checks a game's links, exits and flags against its scenes (every game without an id)
pnpm loc             # lines of code per app and package (source / tests)
pnpm deploy:preview  # lint, typecheck, check the games, then deploy the web site to a Vercel preview URL
pnpm deploy:prod     # same, to production
```

The mobile app's commands, on Expo's servers (EAS), from the root (see Testing
the mobile app):

```bash
pnpm mobile:login    # logs in to your Expo account, once
pnpm mobile:whoami   # the Expo account you are logged in to
pnpm mobile:apk      # an Android preview build (.apk), to install on testers' phones
pnpm mobile:ios      # an iOS preview build, for the registered devices
pnpm mobile:device   # registers a tester's iPhone, for the iOS preview builds
pnpm mobile:builds   # the last 5 builds, their status and their links
pnpm mobile:update   # lint, typecheck, check the games, then send the app's JS and images to the preview builds
pnpm mobile:updates  # the last 5 updates sent to the preview builds
pnpm mobile:doctor   # checks the app's dependencies and config against its Expo SDK
pnpm eas <command>   # any other EAS command, e.g. pnpm eas build:cancel
```

## The studio

`pnpm dev:studio`, then http://localhost:3100: the games of `content/games`,
built in the browser. It runs only on this machine and is never deployed: it
reads and writes the same files as the generator, formatted by Biome, and writes
the lists of both apps again (`content/games/index.ts`, `images.ts`) after it
saves a scene. Commit as usual once done (see Committing).

- **A game** (`/games/<game>`): its title and its first scene; its **map**,
  each scene a card, dragged where you want it (the places stay in the browser,
  not in `game.json`), each exit on it led by its select to a scene or left
  closed, the links drawn between the cards; the game **checked** as
  `pnpm check-game` checks it, on what is being edited; and the game **played**
  beside it, in a phone's or a tablet's frame. Save writes `game.json`
  (Ctrl+S).
- **A scene** (`/games/<game>/scenes/<id>`): its image, with the safe zone and
  what a phone and a tablet crop; its objects' boxes (`objects.json`) drawn
  (O), moved, resized, nudged with the arrows; its characters placed by their
  feet (C), their height dragged, their layer uploaded (a PNG with its
  transparency: `<id>.webp`, its original in `sources/`, its proportions in
  `characters.json`); and in fields, each object's label, actions (`exit`,
  `sets`, `requires`, `search`), what it holds from the game's items, each
  character's dialogue, and the scene's title, intro, opening and back button.
  It is played beside it as it is edited, saved or not. Ctrl+Z undoes, Ctrl+S
  saves `scene.json`, `objects.json` and `characters.json`.
- **The generator's commands**, run by the studio as in the terminal, with the
  same API keys (`packages/generator/.env.local`): a new game from a brief
  (`generate-game`), a new game from one scene or a scene added to a game, or
  painted again (`generate-scene`), the exits linked from the plan
  (`link-game`), the nights (`generate-night`), a scene or a game removed. Each
  one opens its console, on the right: what it prints, its renders, and its
  questions as buttons (« valider », « repeindre »…) or a text field. The dock,
  in the bottom right corner, lists those running; one at a time per game.

The studio runs each command as a child process with `ESQUISSE_STUDIO=1`: its
questions and its renders are then lines of JSON after `@studio `
(`packages/generator/src/studio.ts`), answered on its stdin, instead of the
terminal's prompts and the image viewer. The preview plays a scene with the web
site's own components (`apps/web/components`), in an iframe of the studio
(`app/(preview)`), to which the page sends the game as it is being edited.

| File | Role |
| --- | --- |
| `apps/studio/lib/server/content.ts` | The games read from disk, and written: game.json, a scene's three files, a character's layer |
| `apps/studio/lib/server/jobs.ts` | The generator's commands, run as child processes, their events streamed to the page |
| `apps/studio/components/game/` | A game's page: its map, its check |
| `apps/studio/components/scene/` | A scene's page: the image and what is placed on it, the fields, the history |
| `apps/studio/components/Preview.tsx`, `app/(preview)/preview/Player.tsx` | The game played as it is being edited |
| `packages/engine/src/games/check.ts` | The checks of a game (`checkGame`), shared by `pnpm check-game` and the studio |

## Deploying the web site (Vercel)

Once, from the repository root: `vercel link`, to create or pick the Vercel
project, then in its settings set **Root Directory** to `apps/web` (Vercel
installs the whole pnpm workspace, so `@esquisse/engine` is found). The deploy
scripts then upload from the root. The region is set in `apps/web/vercel.json`
(`fra1`, Paris).

The scripts are not named `deploy`: `pnpm deploy` is a built-in pnpm command.

## Testing the mobile app (EAS Update)

Testers install a preview build once. Each `pnpm mobile:update` then sends them
the new JS and images, without a new build: the app downloads the update when
it starts and shows it the next time it is opened (close it and open it again).

The project is on Expo as `@damienlequere/esquisse`; its ID and its updates' URL
are in `apps/mobile/app.json` (`extra.eas.projectId`, `updates.url`). The build
profiles are in `apps/mobile/eas.json`: `preview` (internal distribution, an
`.apk` on Android, channel `preview`) and `production` (the stores, channel
`production`).

1. `pnpm mobile:login`, once, with your Expo account.
2. `pnpm mobile:apk` builds the Android preview, in 10 to 20 minutes. The first
   time, answer yes to generating a keystore: Expo keeps it. `pnpm mobile:builds`
   gives the build's link: send it to the testers, who open it on their phone
   and install the app (allowing their browser to install apps).
3. After each change, `pnpm mobile:update` publishes it on the `preview`
   channel, with the last commit's message; `pnpm mobile:updates` lists what
   was sent.

A new build is needed only when the native side changes: a library with native
code, an SDK upgrade, the icon or `app.json`'s native settings. Raise `version`
in `app.json` when you do: `runtimeVersion` follows it (`appVersion` policy), so
older builds do not receive JS they cannot run.

On iOS, a preview build needs an Apple Developer account. Each tester's iPhone
is registered with `pnpm mobile:device` (they open the link it gives), then
`pnpm mobile:ios` builds for the registered devices; or use TestFlight.

The scripts are in `apps/mobile/package.json` (`pnpm build:apk`, `pnpm
update:preview`… from `apps/mobile`), the root's `mobile:` scripts call them.
None is named like a pnpm command: `pnpm login`, `pnpm whoami`, `pnpm doctor`
and `pnpm update` are pnpm's own, and would run instead of the script.

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
  the intro, the style, the light and the decor, painted by Gemini. In a game
  made by `pnpm generate-game`, its exits are objects found in it by
  `pnpm link-game`, and its night is painted by `pnpm generate-night`. The other
  objects, the characters, their texts and dialogues are written by hand.
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
| `content/games/<game>/game.json` | A game: its first scene, and its scenes' links (written by `pnpm generate-game` and `pnpm link-game`, or by hand) |
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

A scene with its night (`"night"` in its `scene.json`, `nuit.webp`, see A
game's night) has a **wait item** in its ring menu, between the logbook and
the cogwheel: a moon by day, a sun by night (`WAIT_ICONS`). It lets night
fall, or the day break, for the whole game (`night` in
`GameProgress`): the night's image fades over the day's in 2.5 s
(`NIGHT_FADE`, at once for whom asks for less motion), a toast says « La nuit
tombe. » or « Le jour se lève. », and every scene with its night shows it until
the player waits again; one without stays in daylight. The background's
animations are the day's: none at night.

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
| `packages/generator/src/link-game.ts` | A game linked from its plan: each exit's threshold found in its scene, made an object, and the game's links |
| `packages/generator/src/generate-night.ts` | Each scene's night, its background painted again, listed for both apps |
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

### Making a game, step by step

A playable game, from one brief, in three commands, each run once the one
before it is done:

```bash
pnpm generate-game tristram6 "<brief>"  # 1. the plan, then each scene's background
pnpm link-game tristram6                # 2. the exits found in each scene, the scenes linked
pnpm generate-night tristram6           # 3. each scene's night, for the ring menu's wait item
```

1. **The plan and the backgrounds** (`pnpm generate-game`, see A new game). The
   game must not exist yet (`pnpm remove-game` first). The brief fixes what
   matters to you; Claude invents the rest. For the map to be yours, say how
   many scenes, their ids and orientations, which one opens on its title, how
   they follow one another and through which thresholds (a door, a gate, a
   stair), and what is seen from afar:

   ```bash
   pnpm generate-game tristram6 "un village médiéval gothique et maudit à la tombée du soir : brume, maisons à colombages noircies, une cathédrale sombre qui domine tout. Quatre scènes : 'rue' en portrait, une rue boueuse qui monte vers la cathédrale, avec à gauche la porte de l'auberge et au fond le passage vers la place ; 'auberge' en paysage, la salle commune vue depuis sa porte ; 'place' en paysage, la place du village autour d'un puits, avec la grille du cimetière ; 'cimetiere' en portrait, derrière la grille. Seule la première scène a une ouverture."
   ```

   Read the plan before validating it: each scene's viewpoint, its landmarks,
   each exit (`→`), its threshold and its cell in the image. A threshold may
   still be painted against the image's edge, outside the safe zone, where a
   phone crops it: ask (`m`) for it at the center rather than at an edge if it
   matters. Then validate each background on its render (`v`), or have it
   painted again (`r`), or describe a change (`m`).

2. **The exits** (`pnpm link-game`, see Linking a game). Each exit's threshold
   is found in its scene and its box drawn on the render, with the share of it
   outside the safe zone: validate the scene (`v`), or have it detected again
   (`r`). The game's links are then written, and the game checked: it is
   playable at `/game/tristram6` (`pnpm dev`).

3. **The night** (`pnpm generate-night`, see A game's night). Each scene's
   night is drawn with the exits' boxes over it: they must still frame their
   thresholds. Validate it (`v`), or have it painted again (`r`) if something
   appeared or moved.

A scene painted again later (`pnpm generate-scene`) loses its exits and its
night: run `pnpm link-game <game>` and `pnpm generate-night <game>` again, which
only make what is missing. Then commit the game's folder with the lists (see
Committing).

### A new game

```bash
pnpm generate-game <game> "<brief>" [--model <id>] [--art <id>|"<direction>"]
```

The brief says what the whole game is about, and may fix its scenes: how many,
their names, their orientations, what each shows or does not, which ones open on
their title, how they follow one another. Claude writes the plan, a map of a
first-person game: the game's title, one style for all its images, its
**world** (the whole place, its hour, where its light comes from, and two to
four **landmarks** seen from afar), and its scenes, each a viewpoint on that
world, with its id, its orientation, its opening, where the player stands and
looks, its own brief, the landmarks seen from there and where in the image, its
**exits** and the one its back button takes. Each exit goes through a
**threshold** painted in the decor (a door, a gate, a stair, a street corner),
in a cell of the image (left, center or right; middle or bottom), to another
scene, which has an exit back, unless it has none (`oneWay`): no two scenes
show the same space from two angles. The plan is checked (each exit leads to a
scene that leads back, two exits of a scene are in two cells, every scene is
reached from the first, every landmark is the world's) and sent back to Claude
until it is. Then `v` validate, `m` describe a change, `q` quit.

`--model` chooses the Claude model that writes the plan and every scene, for
the whole run: `claude-opus-5-5` by default, or another id the API knows, such
as `claude-fable-5-1`, `claude-sonnet-5-5` or `claude-haiku-5-5`. It is checked
before anything is paid for (an unknown id lists those the API knows), and kept
in `generation.textModel`. A refused request goes to another model by itself
only on Fable 5.1, Opus 5.5, Opus 5 and Sonnet 5.5. `pnpm generate-scene`
always writes with `claude-opus-5-5`.

`--art` is the images' **art direction**, given to Claude for the plan and every
scene: the id of one of the presets in `packages/generator/src/art.ts`, or a
text of your own, in quotes. The game's style is written within it, and ends
with the bans that hold for any image (no text, no frame) and the direction's
own.

| `--art` | The images |
| --- | --- |
| `matte-painting` (default) | Cinematic digital matte painting: realistic, detailed, credible light, a serious tone |
| `huile` | Old-master oil painting: visible brushwork, glazes, deep chiaroscuro |
| `aquarelle` | Watercolour and ink: transparent washes, paper grain, a fine ink line |
| `gravure` | Etching: black or sepia hatching on cream paper, an old book's plates |
| `ligne-claire` | Franco-Belgian *ligne claire* comics: even inked outlines, flat colours |
| `animation` | Hand-painted animation backgrounds in gouache, no outlines |

A direction other than the default is kept whole in `game.json`
(`"artDirection"`, its id and label for a preset), and the scenes added to the
game later are written within it. Adding a preset is adding an entry to
`ART_DIRECTIONS`: the commands and the studio list it.

Each scene is then made as `pnpm generate-scene` makes one, from its brief,
written within the game, and saved once validated. Claude reads the game's
brief, its world, the scene's place in it (its viewpoint, its landmarks, its
exits, whose thresholds it paints where the plan puts them), and the scenes next
to it already painted (those its exits lead to or come from: their decor, their
light, the threshold seen from their side); the style is the plan's, the same
for every scene. The game starts in the first scene; its scenes are not linked
yet: their exits are in the plan, in `generation`, not yet objects of the
scenes nor links of the game, which `pnpm link-game` makes (see Linking a
game).

```text
$ pnpm generate-game tristram6 "un village médiéval gothique et maudit à la tombée du soir…"
Writing with claude-opus-5-5…

Tristram
Style : Matte painting numérique de cinéma…

Monde : un village sur une butte, le soleil couchant à l'ouest…
  ◆ cathedrale : une cathédrale gothique noire (au nord, en haut de la butte)

1. rue (portrait, avec ouverture) — en bas de la rue, face au nord
   Décor : une rue montante…
   Repères : cathedrale (au fond, au centre, au-dessus des toits)
   → place-du-village « Monter » par le haut de la rue (au centre, à mi-hauteur)
2. place-du-village (landscape) — au débouché de la rue, face à l'est
   Décor : la place ronde…
   → rue « Descendre » par l'entrée de la rue (à gauche, en bas) [retour]
Le plan :  [v] valider  [m] modifier  [q] quitter
> v
New game "tristram6", starting in "rue": content/games/tristram6/game.json

── 1/2 : rue (portrait)
…
```

The game's `game.json` keeps how it was generated, once, in `"generation"`:
the command, the date, the models, the changes asked to the plan, the world,
and for each scene its plan (its viewpoint, its landmarks, its exits, its back), then, once validated, its title, intro, style, light and
background, with the changes asked to it. Gemini got, one per line, the style,
the background and `Format portrait.` or `Format paysage.`. It never changes
after: the scenes' `scene.json` do. Quitting keeps the scenes validated; the
others stay in the plan, to make with `pnpm generate-scene`.

The game must not exist: `pnpm remove-game` first. Each plan and each change to
it is one Claude request, on top of the scenes'.

### Linking a game

```bash
pnpm link-game <game>
```

For a game made by `pnpm generate-game`, whose plan is a map. For each scene
of the plan on disk, Claude finds each exit's threshold in the painted
background (its original in `sources/`, at most 1568 pixels wide or high): its
box, its name, a short description in English (`detect`), and the text shown
when the exit stays closed, as when the scene is played alone. The render shows
the boxes, and the share of each outside the safe zone; then `v` validate, `r`
detect again, `p` pass the scene, `q` quit. A validated scene is saved at once:
each exit an object of its `scene.json` (`label`, `actions: [{ label, exit,
text }]`), its box in `objects.json`, and its `back` from the plan. Then the
game's `links` are written from the plan, for the exits made whose scene is on
disk, and the game is checked as `pnpm check-game` checks it.

An exit already made is kept as it is, its box adjusted by hand included: run it
again after painting a scene again, or after passing one. One Claude request per
exit found.

```text
$ pnpm link-game tristram6
── rue
  Finding « auberge » → auberge: la porte basse de l'auberge…
    La porte de l'auberge: {"x0":0.224,"y0":0.573,"x1":0.425,"y1":0.848}
Les sorties :  [v] valider  [r] redétecter  [p] passer  [q] quitter
> v
…
✓ tristram6
```

### A game's night

```bash
pnpm generate-night <game> [<scene>…]
```

Without scenes, every scene of the game without its night yet, in the order of
its plan. Each night is the scene's background painted again: Claude writes,
from the game's world and the scene, its night light and what the night
changes (the moon on the same side of the world in every scene, the lanterns
and windows lit), in one conversation for the whole game, for its nights to
agree; Gemini repaints the day's original (`sources/fond.jpg`) with it, the
same framing, each thing in its place, for the objects' boxes to stay right.
The render shows the night with those boxes; then `v` validate, `r` paint again,
`m` describe a change, `p` pass the scene, `q` quit. A validated night is saved
at once: `nuit.webp`, its original in `sources/nuit.jpg`, `"night"` in
`scene.json` (its light and its prompt), and the scene listed with its night
for both apps (`night` in `content/games/images.ts`). Naming a scene paints its
night again.

### A new scene

```bash
pnpm generate-scene <game> <id> portrait|landscape "<brief>" [--art <id>|"<direction>"]
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
- **`--art`** is the images' art direction, a preset's id or a text of your
  own in quotes (see A new game), in place of the game's (its `game.json`'s
  `"artDirection"`) or else the default one, `matte-painting`.
  A new game keeps it in its `game.json`, for the scenes added to it later.

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
generator and never edited by hand. For a game made step by step, commit its
whole folder (`content/games/<game>/`): its `game.json` with its plan and its
links, each scene with its exits (`scene.json`, `objects.json`) and its night
(`nuit.webp`, `sources/nuit.jpg`), with the lists.

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
- `babel-preset-expo` and `@babel/plugin-transform-react-jsx` are
  devDependencies of `apps/mobile`, though nothing imports them: Babel looks
  for the presets of `babel.config.js`, and for the plugins they name
  (NativeWind's names the JSX one), from `apps/mobile`, where pnpm only lets it
  find the app's own dependencies. Without them, the Android build on Expo's
  servers (Gradle's bundling step) fails with « Cannot find module … ».
- `apps/mobile` is on Expo SDK 58, with its own React version (19.3.0; the web
  uses the catalog's). `pnpm mobile:doctor` says which packages are behind the
  SDK; `npx expo install --fix`, from `apps/mobile`, brings them up to it.
