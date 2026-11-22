"use client";

// A game as it is on disk, read again after a job on it is over (see Jobs),
// unless the page holds changes not saved yet: then it says so.

import { useCallback, useEffect, useRef, useState } from "react";
import { useJobs } from "../../components/jobs/Jobs.tsx";
import type { StudioGame } from "../types.ts";
import { api } from "./api.ts";

export const useGame = (id: string, dirty: boolean) => {
  const [game, setGame] = useState<StudioGame>();
  const [error, setError] = useState<string>();
  // The disk changed under changes not saved.
  const [stale, setStale] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const { onDone } = useJobs();

  const reload = useCallback(async () => {
    try {
      setGame(await api<StudioGame>(`/api/games/${id}`));
      setError(undefined);
      setStale(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(
    () =>
      onDone(id, () => {
        if (dirtyRef.current) setStale(true);
        else reload();
      }),
    [id, onDone, reload],
  );

  return { game, setGame, error, reload, stale };
};
