"use client";

// A document edited with undo and redo. Changes made under the same key one
// after the other (the letters typed in one field, the moves of one drag) are
// one step.

import { useCallback, useReducer } from "react";

type History<T> = { past: T[]; present: T; future: T[]; key?: string; at: number };

type Action<T> =
  | { type: "set"; value: T; key?: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; value: T };

const LIMIT = 200;
// Changes under one key, apart by less than this, are one step.
const MERGE = 1200;

const reducer = <T>(state: History<T>, action: Action<T>): History<T> => {
  switch (action.type) {
    case "set": {
      if (action.value === state.present) return state;
      const now = Date.now();
      const merge = action.key !== undefined && action.key === state.key && now - state.at < MERGE;
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-LIMIT),
        present: action.value,
        future: [],
        key: action.key,
        at: now,
      };
    }
    case "undo": {
      const previous = state.past.at(-1);
      if (previous === undefined) return state;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        at: 0,
      };
    }
    case "redo": {
      const [next, ...future] = state.future;
      if (next === undefined) return state;
      return { past: [...state.past, state.present], present: next, future, at: 0 };
    }
    case "reset":
      return { past: [], present: action.value, future: [], at: 0 };
  }
};

export const useHistory = <T>(initial: T) => {
  const [state, dispatch] = useReducer(reducer as (s: History<T>, a: Action<T>) => History<T>, {
    past: [],
    present: initial,
    future: [],
    at: 0,
  });
  return {
    value: state.present,
    set: useCallback((value: T, key?: string) => dispatch({ type: "set", value, key }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    reset: useCallback((value: T) => dispatch({ type: "reset", value }), []),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
};
