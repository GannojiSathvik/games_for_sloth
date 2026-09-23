"use client";
// CountdownTimer — draws the submission window as a draining ring.
// Reads the deadline straight off the round row, so a remount or a
// router.refresh() can never desync it.

import { useEffect, useRef } from "react";
import { resolveCurrentRound } from "@/actions/game-actions";
import { useNow } from "@/lib/use-clock";

interface Props {
  /** ISO timestamp when submissions close. */
  deadline: string;
  /** ISO timestamp when the round opened — the other end of the ring. */
  startedAt: string;
  roomId: string;
}

export default function CountdownTimer({ deadline, startedAt, roomId }: Props) {
  const now = useNow();
  const deadlineMs = new Date(deadline).getTime();
  const startedMs = new Date(startedAt).getTime();

  const secondsLeft = now === 0 ? 0 : Math.max(0, Math.ceil((deadlineMs - now) / 1000));
  const expired = now !== 0 && now >= deadlineMs;

  // One resolve attempt per deadline, surviving refreshes within this tab.
  const resolveKey = `kod_resolved_${roomId}_${deadline}`;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [deadline]);

  useEffect(() => {
    if (!expired || firedRef.current) return;
    try {
      if (sessionStorage.getItem(resolveKey)) return;
      sessionStorage.setItem(resolveKey, "1");
    } catch {
      // Private mode / storage disabled — the ref guard still covers this tab.
    }
    firedRef.current = true;

    resolveCurrentRound(roomId).catch((err) => {
      console.error("resolveCurrentRound failed:", err);
      firedRef.current = false;
      try {
        sessionStorage.removeItem(resolveKey);
      } catch {}
    });
  }, [expired, resolveKey, roomId]);

  // The ring must drain against the round's TOTAL length. The previous version
  // divided the remaining time by the remaining time, so it always read ~100%.
  const totalMs = Math.max(1, deadlineMs - startedMs);
  const pct = now === 0 ? 100 : Math.max(0, Math.min(100, ((deadlineMs - now) / totalMs) * 100));
  const isUrgent = now !== 0 && secondsLeft <= 10;

  const R = 36;
  const C = 2 * Math.PI * R;
  const arc = (pct / 100) * C;

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={R} fill="none" strokeWidth="6" className="stroke-zinc-800" />
          <circle
            cx="48" cy="48" r={R}
            fill="none" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            className={isUrgent ? "stroke-red-500" : "stroke-emerald-500"}
            style={{
              filter: isUrgent
                ? "drop-shadow(0 0 8px rgb(239 68 68))"
                : "drop-shadow(0 0 6px rgb(16 185 129))",
              transition: "stroke-dasharray 0.25s linear",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-black font-mono tabular-nums ${isUrgent ? "text-red-400 animate-pulse" : "text-white"}`}>
            {now === 0 ? "" : secondsLeft}
          </span>
        </div>
      </div>
      <span className={`text-xs font-medium tracking-wide ${isUrgent ? "text-red-500 animate-pulse" : "text-zinc-500"}`}>
        {isUrgent ? "⚡ hurry!" : "seconds"}
      </span>
    </div>
  );
}
