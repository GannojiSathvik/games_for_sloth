"use client";

import { useSyncExternalStore } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// A single shared wall-clock, exposed as a React external store.
//
// Why not just call Date.now() while rendering?
//   • Rendering must be pure. Date.now() returns something different every call,
//     which breaks React's ability to re-run a render safely (and trips the
//     React Compiler lint rules).
//   • The server and the browser would read different values, so the first
//     client paint wouldn't match the server HTML — a hydration mismatch.
//
// useSyncExternalStore is React's built-in answer: `subscribe` wires up the
// external source (here, one setInterval shared by every timer on the page),
// `getSnapshot` returns the cached value, and `getServerSnapshot` returns a
// fixed 0 so server HTML is deterministic. Components treat `now === 0` as
// "clock not started yet" and render a neutral placeholder.
// ─────────────────────────────────────────────────────────────────────────────

const TICK_MS = 250;

let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

/** Current time in ms. Returns 0 on the server and until the first client tick. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
