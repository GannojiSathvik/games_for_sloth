"use client";

// ResultTimer — shown when a round is completed
// Shows results for 20 seconds, then calls advanceRound
// Any player can click "Skip" to advance immediately

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { advanceRound } from "@/actions/game-actions";

interface Props {
  resolvedAt: string;          // ISO — when the round finished
  roomId: string;
  resultDisplayMs?: number;    // default 20000 (20s)
}

export default function ResultTimer({ resolvedAt, roomId, resultDisplayMs = 20000 }: Props) {
  const router        = useRouter();
  const [msLeft, setMsLeft] = useState<number>(resultDisplayMs);
  const [mounted, setMounted] = useState(false);
  const advancedRef   = useRef(false);
  const resolvedRef   = useRef(resolvedAt);

  // Reset when a new round resolves
  if (resolvedRef.current !== resolvedAt) {
    resolvedRef.current = resolvedAt;
    advancedRef.current = false;
  }

  // ── Trigger advance ──────────────────────────────────────────────────────
  function doAdvance() {
    if (advancedRef.current) return;
    advancedRef.current = true;
    advanceRound(roomId)
      .then(() => router.refresh())   // immediately sync this client
      .catch((err) => {
        console.error(err);
        advancedRef.current = false;
      });
  }

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    advancedRef.current = false;
    const resolvedTime = new Date(resolvedAt).getTime();

    function tick() {
      const elapsed = Date.now() - resolvedTime;
      const left    = Math.max(0, resultDisplayMs - elapsed);
      setMsLeft(left);
      if (left === 0) doAdvance();
    }

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAt, roomId, resultDisplayMs]);

  if (!mounted) {
    return <div className="flex items-center gap-3 h-8"></div>;
  }

  const seconds = Math.ceil(msLeft / 1000);
  const pct     = (msLeft / resultDisplayMs) * 100;

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500/70 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Countdown */}
      <span className="text-xs text-zinc-500 font-mono min-w-[6rem] text-right whitespace-nowrap">
        Next in {seconds}s
      </span>

      {/* Skip button — any player can skip */}
      <button
        onClick={doAdvance}
        className="text-xs text-zinc-600 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded px-2.5 py-1 transition-all whitespace-nowrap hover:bg-zinc-800"
      >
        Skip ⏭
      </button>
    </div>
  );
}
