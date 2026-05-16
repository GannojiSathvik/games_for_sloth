"use client";
// EliminationOverlay — full-screen acid pour animation shown when a player is eliminated.
// Auto-dismisses after 3.5s. CSS-only animation for 60 FPS.

import { useEffect, useState, memo } from "react";

interface EliminatedPlayer {
  username: string;
  score: number;
}

interface Props {
  eliminated: EliminatedPlayer[];
  onDismiss: () => void;
}

export default memo(function EliminationOverlay({ eliminated, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible || eliminated.length === 0) return null;

  // Acid drop positions (stable — computed once per render)
  const drops = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center
                 bg-black/90 backdrop-blur-sm kod-fade-in"
      role="alertdialog"
      aria-label="Player eliminated"
    >
      {/* Acid SVG */}
      <svg
        viewBox="0 0 300 200"
        className="w-64 h-48 mb-6"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Dripping acid drops from top */}
        <g className="kod-acid-container" style={{ transformOrigin: "150px 0px" }}>
          {/* Main acid pool */}
          <rect
            x="60" y="0" width="180" height="60"
            fill="rgba(180,255,0,0.85)"
            className="kod-acid-glow"
            rx="4"
          />
          {/* Pool drips */}
          {drops.map((i) => (
            <ellipse
              key={i}
              className="kod-acid-drop"
              cx={80 + i * 25}
              cy={55}
              rx="5"
              ry="8"
              fill="rgba(180,255,0,0.9)"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Players */}
      <div className="space-y-4 text-center">
        {eliminated.map((p) => (
          <div key={p.username} className="kod-player-fade">
            <p className="text-red-400 text-3xl font-black tracking-wider uppercase">
              {p.username}
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              ELIMINATED · Final Score: <span className="text-red-300 font-bold">{p.score}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-zinc-600 text-xs animate-pulse">Continuing in a moment…</p>
    </div>
  );
});
