"use client";

// RoundBanner — shows for exactly 2 seconds after a round starts.
// Uses the round's createdAt timestamp so it is completely immune
// to rule intro round extensions or round duration mismatches.

import { useEffect, useState } from "react";

interface Props {
  roundNumber: number;
  createdAtIso: string; // ISO string of round.createdAt
}

const BANNER_MS = 2000;

export default function RoundBanner({ roundNumber, createdAtIso }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const startMs = new Date(createdAtIso).getTime();
    const elapsed = Date.now() - startMs;
    const msLeft = BANNER_MS - elapsed;

    if (msLeft <= 0) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), msLeft);
    return () => clearTimeout(timer);
  }, [createdAtIso]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Semi-transparent dark overlay */}
      <div className="absolute inset-0 bg-black/85" />
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
