"use client";

// ResultTimer — counts down the results screen, then advances the round.
// Any player can press Skip to move on immediately; advanceRound is idempotent
// on the server, so several clients firing at once is harmless.

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { advanceRound } from "@/actions/game-actions";
import { useNow } from "@/lib/use-clock";

interface Props {
  resolvedAt: string;
  roomId: string;
  resultDisplayMs?: number;
}

export default function ResultTimer({ resolvedAt, roomId, resultDisplayMs = 20000 }: Props) {
  const router = useRouter();
  const now = useNow();
  const resolvedMs = new Date(resolvedAt).getTime();

  const msLeft = now === 0 ? resultDisplayMs : Math.max(0, resultDisplayMs - (now - resolvedMs));
  const expired = now !== 0 && msLeft === 0;

  // One advance attempt per resolved round, surviving refreshes within this tab.
  const advanceKey = `kod_advanced_${roomId}_${resolvedAt}`;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [resolvedAt]);

  const doAdvance = useCallback(() => {
    if (firedRef.current) return;
    try {
      if (sessionStorage.getItem(advanceKey)) return;
      sessionStorage.setItem(advanceKey, "1");
    } catch {
      // Storage unavailable — the ref guard still covers this tab.
    }
    firedRef.current = true;

    advanceRound(roomId)
      .then(() => router.refresh())
      .catch((err) => {
        console.error("advanceRound failed:", err);
        firedRef.current = false;
        try {
          sessionStorage.removeItem(advanceKey);
        } catch {}
      });
  }, [advanceKey, roomId, router]);

  useEffect(() => {
    if (expired) doAdvance();
  }, [expired, doAdvance]);

  const seconds = Math.ceil(msLeft / 1000);
  const pct = (msLeft / resultDisplayMs) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500/70 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 font-mono min-w-[6rem] text-right whitespace-nowrap">
        Next in {seconds}s
      </span>
      <button
        onClick={doAdvance}
        className="text-xs text-zinc-600 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded px-2.5 py-1 transition-all whitespace-nowrap hover:bg-zinc-800"
      >
        Skip ⏭
      </button>
    </div>
  );
}
