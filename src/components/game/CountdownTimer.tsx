"use client";
// CountdownTimer — reads deadline directly, no delay state (resistant to remounts)
// The RoundBanner covers it visually for its 2s duration.

import { useEffect, useRef, useState } from "react";
import { resolveCurrentRound } from "@/actions/game-actions";

interface Props { deadline: string; roomId: string; }

export default function CountdownTimer({ deadline, roomId }: Props) {
  const deadlineMs   = new Date(deadline).getTime();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [mounted, setMounted] = useState(false);
  const resolvedRef  = useRef(false);
  const prevDeadline = useRef(deadline);

  // Reset resolve guard when deadline changes (new round)
  if (prevDeadline.current !== deadline) {
    prevDeadline.current = deadline;
    resolvedRef.current  = false;
  }

  useEffect(() => {
    setMounted(true);
    resolvedRef.current = false;

    function tick() {
      const left = Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !resolvedRef.current) {
        resolvedRef.current = true;
        resolveCurrentRound(roomId).catch((err) => {
          console.error(err);
          resolvedRef.current = false;
        });
      }
    }

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, roomId]);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="36" fill="none" strokeWidth="6" className="stroke-zinc-800" />
          </svg>
        </div>
      </div>
    );
  }

  const totalSecs = Math.max(1, Math.ceil((deadlineMs - Date.now()) / 1000));
  const pct       = (secondsLeft / totalSecs) * 100;
  const isUrgent  = secondsLeft <= 10;

  const R   = 36;
  const C   = 2 * Math.PI * R;
  const arc = Math.max(0, (pct / 100)) * C;

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
            style={{ filter: isUrgent ? "drop-shadow(0 0 8px rgb(239 68 68))" : "drop-shadow(0 0 6px rgb(16 185 129))", transition: "stroke-dasharray 0.5s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-black font-mono tabular-nums ${isUrgent ? "text-red-400 animate-pulse" : "text-white"}`}>
            {secondsLeft}
          </span>
        </div>
      </div>
      <span className={`text-xs font-medium tracking-wide ${isUrgent ? "text-red-500 animate-pulse" : "text-zinc-500"}`}>
        {isUrgent ? "⚡ hurry!" : "seconds"}
      </span>
    </div>
  );
}
