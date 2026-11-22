"use client";

// What a game was generated from, as game.json keeps it: its author's brief
// and, in "generation", how pnpm generate-game made it (the models, the changes
// asked to the plan, the world, and each scene's plan, then what was painted).
// Shown as it was written, once: the scenes' scene.json is what changes after.

import type { Game, GeneratedScene, World } from "@esquisse/engine";
import type { ReactNode } from "react";

const X: Record<string, string> = { left: "left", center: "center", right: "right" };
const Y: Record<string, string> = { middle: "middle", bottom: "bottom" };

const Block = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{label}</p>
    <div className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-300">{children}</div>
  </div>
);

const Changes = ({ changes, label }: { changes?: string[]; label: string }) =>
  changes && changes.length > 0 ? (
    <Block label={label}>
      <ol className="flex list-decimal flex-col gap-1 pl-4">
        {changes.map((c, i) => (
          // Changes are kept in order, and may repeat.
          <li key={`${i}:${c}`}>{c}</li>
        ))}
      </ol>
    </Block>
  ) : null;

// One scene of the plan: where it stands in the world and what it leads to,
// then, once painted and validated, what Claude wrote for it.
export const PlannedScene = ({ plan, world }: { plan: GeneratedScene; world?: World }) => (
  <div className="flex flex-col gap-3">
    <p className="text-xs text-zinc-500">
      {plan.orientation}
      {plan.opening ? ", opens on its title" : ", no opening"}
      {plan.background === undefined && " · not painted from the plan yet"}
    </p>
    {plan.viewpoint && <Block label="Viewpoint">{plan.viewpoint}</Block>}
    <Block label="Brief">{plan.brief}</Block>
    {plan.landmarks && plan.landmarks.length > 0 && (
      <Block label="Landmarks seen">
        <ul className="flex flex-col gap-1">
          {plan.landmarks.map((l) => (
            <li key={l.id}>
              <span className="text-zinc-100">{l.id}</span> — {l.where}
              {world?.landmarks.find((w) => w.id === l.id) === undefined && (
                <span className="text-red-300"> (not in the world)</span>
              )}
            </li>
          ))}
        </ul>
      </Block>
    )}
    {plan.exits && plan.exits.length > 0 && (
      <Block label="Exits">
        <ul className="flex flex-col gap-1.5">
          {plan.exits.map((e) => (
            <li key={e.id}>
              <span className="text-emerald-300">{e.id}</span> « {e.label} » →{" "}
              <span className="text-zinc-100">{e.to}</span>
              <span className="text-zinc-500">
                {" "}
                ({X[e.zone.x] ?? e.zone.x}, {Y[e.zone.y] ?? e.zone.y}
                {e.id === plan.back ? ", back button" : ""}
                {e.oneWay ? ", one way" : ""})
              </span>
              <br />
              {e.threshold}
            </li>
          ))}
        </ul>
      </Block>
    )}
    <Changes changes={plan.changes} label="Changes asked to its background" />
    {plan.title && <Block label="Title, as painted">{plan.title}</Block>}
    {plan.intro && <Block label="Intro">{plan.intro}</Block>}
    {plan.light && <Block label="Light">{plan.light}</Block>}
    {plan.background && <Block label="Decor (Gemini's prompt)">{plan.background}</Block>}
    {plan.style && <Block label="Style">{plan.style}</Block>}
  </div>
);

export const GameGeneration = ({ game }: { game: Game }) => {
  const g = game.generation;
  if (game.brief === undefined && game.artDirection === undefined && g === undefined)
    return (
      <p className="text-sm text-zinc-500">
        This game keeps no prompt: it was not made by Generate a game. Each scene keeps its own, on
        its page.
      </p>
    );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        As game.json keeps it, written once{g ? ` by ${g.command} on ${g.date}` : ""}: read-only.
        {g && (
          <>
            <br />
            Text: {g.textModel} · Images: {g.imageModel}
          </>
        )}
      </p>
      {game.brief && <Block label="The game's brief">{game.brief}</Block>}
      {game.artDirection && (
        <Block label={`Art direction: ${game.artDirection.label ?? "the author's own"}`}>
          {game.artDirection.direction}
        </Block>
      )}
      <Changes changes={g?.changes} label="Changes asked to the plan" />
      {g?.world && (
        <>
          <Block label="World">{g.world.setting}</Block>
          {g.world.landmarks.length > 0 && (
            <Block label="Landmarks">
              <ul className="flex flex-col gap-1.5">
                {g.world.landmarks.map((l) => (
                  <li key={l.id}>
                    <span className="text-zinc-100">{l.id}</span> — {l.description}{" "}
                    <span className="text-zinc-500">({l.where})</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </>
      )}
      {g?.scenes.map((plan, i) => (
        <details key={plan.id} className="rounded border border-zinc-800 bg-zinc-900/60">
          <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-200">
            {i + 1}. {plan.title ?? plan.id}{" "}
            <span className="text-xs text-zinc-500">{plan.id}</span>
          </summary>
          <div className="border-t border-zinc-800 px-3 py-3">
            <PlannedScene plan={plan} world={g.world} />
          </div>
        </details>
      ))}
    </div>
  );
};
