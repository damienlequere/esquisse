# Template

Monorepo template for a web site and mobile apps (iOS, Android).

```
apps/
  web/       Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
  mobile/    Expo SDK 57 (React Native 0.86) + Expo Router + NativeWind 4
packages/
  shared/    Plain TypeScript shared by both apps (@template/shared)
```

Tooling: pnpm workspaces (versions in the `catalog:` of `pnpm-workspace.yaml`),
Turborepo for tasks, Biome for lint and format.

## Starting a new project

This repository is a GitHub template. To start a project from it:

```bash
gh repo create <owner>/<name> --template damienlequere/next-expo-monorepo --private --clone
cd <name>
```

Then rename the `template` placeholders:

- `name` in `package.json`, and the `@template/*` packages in `apps/*/package.json`,
  `packages/shared/package.json` and every `@template/shared` import;
- `name`, `slug` and `scheme` in `apps/mobile/app.json`;
- the title and description of this README.

Then run `pnpm install` (to update the lockfile), `vercel link` (see below)
and, for builds on Expo's servers, `eas init`.

## Commands

```bash
pnpm install
pnpm dev             # web site: http://localhost:3000 (the frame: /frame)
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
installs the whole pnpm workspace, so `@template/shared` is found). The deploy
scripts then upload from the root. The region is set in `apps/web/vercel.json`
(`fra1`, Paris).

The scripts are not named `deploy`: `pnpm deploy` is a built-in pnpm command.

## The device frame (web)

`/frame` is an example page shown in a device frame: on a large
screen with a mouse, a phone (9:19.5), or a tablet (3:4) from 1024 px wide; on a
phone or a touch tablet, the whole screen. Everything lives in two places:

- `apps/web/app/frame/layout.tsx`: the `#stage` and `#device` elements;
- `apps/web/app/globals.css`: their styles, under a media query.

Any route under `app/frame/` gets the frame. Dialogs and menus must open in
`#device` (positioned), not on `body`: see the `Dialog` in
`apps/web/components/Screen.tsx`.

The mobile app has the same two screens, with the same Tailwind classes through
NativeWind: `apps/mobile/src/app/index.tsx` (home) and `frame.tsx` (the example
screen, full screen).

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
