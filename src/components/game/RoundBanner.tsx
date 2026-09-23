"use client";

// RoundBanner — a 2-second "Round N" splash when a round opens.
// Visibility is derived from the round's own start timestamp, so there is no
// state and no timeout to get stuck: once the clock passes the window, the
// component simply renders nothing.

import { useNow } from "@/lib/use-clock";

interface Props {
  roundNumber: number;
  /** ISO timestamp of when this round row was created. */
  roundStartedAt: string;
}

const BANNER_MS = 2000;

export default function RoundBanner({ roundNumber, roundStartedAt }: Props) {
  const now = useNow();
  const startedMs = new Date(roundStartedAt).getTime();

  // now === 0 means the clock hasn't started (SSR / pre-hydration): stay hidden.
  const visible = now !== 0 && now >= startedMs && now < startedMs + BANNER_MS;
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
