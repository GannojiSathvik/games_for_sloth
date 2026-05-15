"use client";

// RoundBanner — shows for exactly 2 seconds after a round starts.
// Time-based (not state-based) so it's immune to component remounts
// caused by router.refresh() polling.

import { useEffect, useState } from "react";

interface Props {
  roundNumber: number;
  submissionDeadline: string; // ISO string
  roundDurationSecs: number;  // e.g. 30
}

const BANNER_MS = 2000;

function getBannerEndsAt(deadlineIso: string, roundDurationSecs: number): number {
  const deadlineMs    = new Date(deadlineIso).getTime();
  const roundStartsAt = deadlineMs - roundDurationSecs * 1000;
  return roundStartsAt + BANNER_MS;
}

export default function RoundBanner({ roundNumber, submissionDeadline, roundDurationSecs }: Props) {
  // Initialise from timestamp — works even on first mount after a refresh
  const [visible, setVisible] = useState(() => Date.now() < getBannerEndsAt(submissionDeadline, roundDurationSecs));

  useEffect(() => {
    const bannerEndsAt = getBannerEndsAt(submissionDeadline, roundDurationSecs);
    const msLeft = bannerEndsAt - Date.now();

    if (msLeft <= 0) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), msLeft);
    return () => clearTimeout(timer);
  }, [submissionDeadline, roundDurationSecs]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
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
