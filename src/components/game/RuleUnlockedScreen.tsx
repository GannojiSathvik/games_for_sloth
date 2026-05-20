"use client";

// RuleUnlockedScreen — Full-page overlay shown when a new rule is unlocked.
// Displays the specific rule that was just activated with dramatic animation.

import { useEffect, useState } from "react";
import { ShieldAlert, Target, Swords, X } from "lucide-react";

const RULE_DATA: Record<string, {
  name: string;
  icon: typeof ShieldAlert;
  color: string;
  colorClasses: { bg: string; border: string; icon: string; glow: string; text: string };
  description: string;
  example: string;
  scoring: string;
}> = {
  duplicate_guard: {
    name: "Rule 1: Duplicate Guard",
    icon: ShieldAlert,
    color: "orange",
    colorClasses: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/40",
      icon: "bg-orange-500/20 text-orange-400",
      glow: "shadow-[0_0_60px_rgba(249,115,22,0.3)]",
      text: "text-orange-400",
    },
    description: "If 2 or more players choose the same number, that number is INVALID. Those players lose -1 and are excluded from winning.",
    example: "Guesses: 23, 23, 45 → 23 is invalid. Both players with 23 get -1. Player with 45 wins (-0).",
    scoring: "Duplicates: -1 (invalid) · Remaining: normal scoring",
  },
  exact_penalty: {
    name: "Rule 2: Double Penalty",
    icon: Target,
    color: "red",
    colorClasses: {
      bg: "bg-red-500/10",
      border: "border-red-500/40",
      icon: "bg-red-500/20 text-red-400",
      glow: "shadow-[0_0_60px_rgba(239,68,68,0.3)]",
      text: "text-red-400",
    },
    description: "If any player guesses the EXACT target number, all OTHER players lose -2 instead of -1. The exact match winner gets -0.",
    example: "Target: 23.2 ≈ 23. Player with 23 wins (-0). All others lose -2 instead of -1.",
    scoring: "Exact winner: -0 · All others: -2",
  },
  zero_hundred: {
    name: "Rule 3: Zero/Hundred Override",
    icon: Swords,
    color: "purple",
    colorClasses: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/40",
      icon: "bg-purple-500/20 text-purple-400",
      glow: "shadow-[0_0_60px_rgba(168,85,247,0.3)]",
      text: "text-purple-400",
    },
    description: "ONLY when 2 players remain. Rock-paper-scissors override: 100 beats 0 · 0 beats 1 · 1 beats 100.",
    example: "Player A: 0, Player B: 100 → Player B wins (100 beats 0). Player A loses -1.",
    scoring: "RPS Winner: -0 · Loser: -1",
  },
};

interface Props {
  ruleId: string;
  onDismiss: () => void;
}

export default function RuleUnlockedScreen({ ruleId, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const rule = RULE_DATA[ruleId];

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 8s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!rule) return null;
  const Icon = rule.icon;
  const c = rule.colorClasses;

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }} />

      {/* Content */}
      <div className={`relative max-w-md w-full mx-4 transition-all duration-500 ${
        visible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
      }`}>
        {/* Dismiss button */}
        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400); }}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card */}
        <div className={`rounded-2xl border ${c.border} ${c.bg} ${c.glow} p-8 text-center space-y-6`}>
          {/* Animated icon */}
          <div className="relative mx-auto w-fit">
            <div className={`w-20 h-20 rounded-2xl ${c.icon} flex items-center justify-center mx-auto`}>
              <Icon className="w-10 h-10" />
            </div>
            {/* Pulse rings */}
            <div className={`absolute inset-0 w-20 h-20 rounded-2xl ${c.border} border-2 mx-auto animate-ping opacity-20`} />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-bold">🔓 New Rule Unlocked</p>
            <h2 className={`text-2xl font-black ${c.text}`}>{rule.name}</h2>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            {rule.description}
          </p>

          {/* Example */}
          <div className="bg-black/40 rounded-xl border border-white/5 p-4 text-left space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Example</p>
            <p className="text-xs text-zinc-400">{rule.example}</p>
          </div>

          {/* Scoring */}
          <div className="bg-black/30 rounded-lg border border-white/5 p-3">
            <p className="text-xs text-zinc-500 font-mono">{rule.scoring}</p>
          </div>

          {/* Dismiss hint */}
          <p className="text-[11px] text-zinc-700">Click anywhere or wait to continue</p>
        </div>
      </div>
    </div>
  );
}
