"use client";
// GameClearScreen — full-screen victory screen with confetti particles.
// Confetti are DOM-injected in useEffect for zero render cost.

import { useEffect, memo } from "react";
import Link from "next/link";

interface Props {
  winnerUsername: string;
  winnerScore: number;
  isMe: boolean;
  /** Rounds played before the game ended. */
  roundsPlayed: number;
  /** How many players were knocked out along the way. */
  eliminationCount: number;
}

const CONFETTI_COLORS = ["#ffd700", "#ff4500", "#00ff88", "#00cfff", "#ff69b4", "#ffb347"];

export default memo(function GameClearScreen({ winnerUsername, winnerScore, isMe, roundsPlayed, eliminationCount }: Props) {
  // Confetti burst on mount — DOM injection, no state
  useEffect(() => {
    const particles: HTMLElement[] = [];
    for (let i = 0; i < 45; i++) {
      const el = document.createElement("div");
      el.className = "kod-confetti-particle";
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = "-20px";
      el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      el.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
      el.style.animationDuration = `${(2.5 + Math.random() * 1.5).toFixed(2)}s`;
      el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      el.style.width  = `${8 + Math.random() * 8}px`;
      el.style.height = `${8 + Math.random() * 8}px`;
      document.body.appendChild(el);
      particles.push(el);
    }
    const cleanup = setTimeout(() => particles.forEach(p => p.remove()), 5000);
    return () => { clearTimeout(cleanup); particles.forEach(p => p.remove()); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center
                 bg-gradient-to-b from-black via-zinc-950 to-black overflow-hidden"
      role="dialog"
      aria-label="Game Clear"
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                        h-[500px] w-[500px] rounded-full bg-yellow-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
        {/* Crown */}
        <div className="text-8xl kod-victory-in" style={{ animationDelay: "0ms" }}
             aria-hidden>
          👑
        </div>

        {/* GAME CLEAR */}
        <h1
          className="text-5xl sm:text-7xl font-black tracking-tight kod-gold-text kod-victory-in text-yellow-400"
          style={{ animationDelay: "200ms" }}
        >
          GAME CLEAR
        </h1>

        {/* Winner name */}
        <div className="kod-victory-in" style={{ animationDelay: "500ms" }}>
          <p className="text-2xl sm:text-4xl font-black text-white">
            {isMe ? "YOU WIN! 🎉" : `${winnerUsername} WINS!`}
          </p>
          <p className="text-zinc-500 text-sm mt-2">
            {isMe ? "Last one standing. Brilliant play." : `${winnerUsername} outlasted everyone.`}
          </p>
        </div>

        {/*
          Stats. "Survived" used to render a literal ♦ with no number behind it
          — a stat tile with no stat. These three are the facts the game
          actually knows when it ends.
        */}
        <div className="kod-victory-in mt-2 flex items-stretch gap-6 sm:gap-8" style={{ animationDelay: "700ms" }}>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-600">Final Score</p>
            <p className={`font-mono text-3xl font-black ${winnerScore < 0 ? "text-red-400" : "text-emerald-400"}`}>
              {winnerScore === 0 ? "0" : `\u2212${Math.abs(winnerScore)}`}
            </p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-600">Rounds</p>
            <p className="font-mono text-3xl font-black text-zinc-200">{roundsPlayed}</p>
          </div>
          <div className="w-px bg-white/10" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-600">Knocked out</p>
            <p className="font-mono text-3xl font-black text-red-400">{eliminationCount}</p>
          </div>
        </div>

        {/*
          One action, not two. "New Game" and "Go Home" were both plain links to
          "/" — the same destination behind two different promises, which makes
          a player hesitate over a choice that does not exist.
        */}
        <div className="kod-victory-in mt-4 flex justify-center" style={{ animationDelay: "900ms" }}>
          <Link
            href="/"
            className="rounded-xl bg-yellow-500 px-8 py-3 text-base font-black text-black
                       transition-all hover:bg-yellow-400 hover:shadow-[0_0_20px_rgba(234,179,8,0.5)] active:scale-95"
          >
            Play again
          </Link>
        </div>
      </div>
    </div>
  );
});
