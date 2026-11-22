"use client";

// The game checked as pnpm check-game checks it (checkGame in packages/engine),
// on what is being edited, saved or not.

import { checkGame, type Game, type Scene } from "@esquisse/engine";
import { useMemo } from "react";
import type { StudioGame } from "../../lib/types.ts";

export const useCheck = (
  studio: StudioGame | undefined,
  game: Game | undefined,
  scenes?: Record<string, Scene>,
) =>
  useMemo(() => {
    if (studio === undefined || game === undefined) return { errors: [], warnings: [] };
    const all =
      scenes ??
      Object.fromEntries(Object.entries(studio.scenes).map(([id, s]) => [id, s.data.scene]));
    const listed = new Set(
      Object.values(studio.scenes)
        .filter((s) => s.missing.length === 0)
        .map((s) => s.id),
    );
    return checkGame(game, all, listed, studio.items);
  }, [studio, game, scenes]);

export const CheckReport = ({ report }: { report: { errors: string[]; warnings: string[] } }) => {
  if (report.errors.length === 0 && report.warnings.length === 0)
    return <p className="text-sm text-emerald-400">✓ The game checks out.</p>;
  return (
    <ul className="flex flex-col gap-1.5 text-xs leading-snug">
      {report.errors.map((e) => (
        <li key={e} className="flex gap-1.5 text-red-300">
          <span>✗</span>
          <span>{e}</span>
        </li>
      ))}
      {report.warnings.map((w) => (
        <li key={w} className="flex gap-1.5 text-zinc-400">
          <span>⚠</span>
          <span>{w}</span>
        </li>
      ))}
    </ul>
  );
};
