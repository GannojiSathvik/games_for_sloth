"use client";
// BalanceScale — SVG scale that tips toward the winner's side.
// Pure CSS animation via class toggle. GPU-accelerated.

import { memo } from "react";

interface Props {
  winnerSide: "left" | "right" | null; // null = balanced (tie / no winner yet)
}

export default memo(function BalanceScale({ winnerSide }: Props) {
  return (
    <svg
      viewBox="0 0 300 220"
      className="w-36 h-28 opacity-70"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={winnerSide ? `Scale tips ${winnerSide}` : "Balanced scale"}
    >
      {/* Pole */}
      <line x1="150" y1="30" x2="150" y2="150" stroke="#52525b" strokeWidth="4" strokeLinecap="round" />

      {/* Pivot */}
      <circle cx="150" cy="30" r="9" fill="#71717a" className="kod-scale-pivot" />

      {/* Cross beam */}
      <line x1="70" y1="65" x2="230" y2="65" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />

      {/* Left pan */}
      <g className={`kod-scale-left ${winnerSide === "left" ? "tipping" : ""}`}>
        <line x1="75" y1="65" x2="75" y2="115" stroke="#52525b" strokeWidth="2" />
        <rect x="45" y="115" width="60" height="8" rx="3"
              fill={winnerSide === "left" ? "#ffd700" : "#52525b"}
              style={{ transition: "fill 0.4s" }} />
      </g>

      {/* Right pan */}
      <g className={`kod-scale-right ${winnerSide === "right" ? "tipping" : ""}`}>
        <line x1="225" y1="65" x2="225" y2="115" stroke="#52525b" strokeWidth="2" />
        <rect x="195" y="115" width="60" height="8" rx="3"
              fill={winnerSide === "right" ? "#ffd700" : "#52525b"}
              style={{ transition: "fill 0.4s" }} />
      </g>

      {/* Diamond on pivot */}
      <text x="150" y="34" textAnchor="middle" fontSize="12" fill="#ef4444" fontWeight="bold">♦</text>
    </svg>
  );
});
