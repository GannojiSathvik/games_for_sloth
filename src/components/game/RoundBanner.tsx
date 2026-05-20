"use client";

// RoundBanner — shows for exactly 2 seconds after a round starts.
// Hard max timeout of 3s guarantees it ALWAYS dismisses, even if
// the deadline calculation is wrong or the component remounts.

import { useEffect, useState, useRef } from "react";

interface Props {
  roundNumber: number;
  submissionDeadline: string;
  roundDurationSecs: number;
}

const BANNER_MS = 2000;
const HARD_MAX_MS = 3000; // absolute failsafe — never show longer than this

export default function RoundBanner({ roundNumber, submissionDeadline, roundDurationSecs }: Props) {
  const [visible, setVisible] = useState(false);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    mountTime.current = Date.now();

    const deadlineMs = new Date(submissionDeadline).getTime();
    const roundStartsAt = deadlineMs - roundDurationSecs * 1000;
    const bannerEndsAt = roundStartsAt + BANNER_MS;
    const msLeft = bannerEndsAt - Date.now();

    // Already expired — don't show
    if (msLeft <= 0) {
      setVisible(false);
      return;
    }

    // Clamp to HARD_MAX so it never sticks
    const actualMs = Math.min(msLeft, HARD_MAX_MS);
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), actualMs);
    return () => clearTimeout(timer);
  }, [submissionDeadline, roundDurationSecs]);

  // Failsafe: if somehow still visible after HARD_MAX, kill it
  useEffect(() => {
    if (!visible) return;
    const kill = setTimeout(() => setVisible(false), HARD_MAX_MS);
    return () => clearTimeout(kill);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative flex flex-col items-center gap-3 animate-in zoom-in-90 fade-in duration-150">
        <div
          className="text-red-500 font-black drop-shadow-[0_0_30px_rgba(220,38,38,0.9)]"
          style={{ fontSize: "clamp(3rem, 10vw, 6rem)" }}
        >
          ♦
        </div>
        <p
          className="text-white font-black tracking-widest uppercase drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
        >
          Round {roundNumber}
        </p>
        <p className="text-zinc-400 text-lg font-semibold tracking-wider">Submit your guess!</p>
      </div>
    </div>
  );
}
