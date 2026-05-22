"use client";

// RulesOverview — Full-page rules screen shown in the lobby BEFORE starting.
// Displays all rules, scoring system, and progressive unlock mechanic.

import { ShieldAlert, Target, Swords, Zap, Users, Trophy, Skull } from "lucide-react";

const RULES = [
  {
    id: "base",
    name: "Base Game",
    icon: Zap,
    color: "emerald",
    always: true,
    description: "Each player picks a number from 0–100. The target is 80% of the average. Closest to the target wins the round. You MUST submit before the timer runs out!",
    scoring: "Winner: -0 (no penalty) · Others: -1",
  },
  {
    id: "duplicate_guard",
    name: "Rule 1: Duplicate Guard",
    icon: ShieldAlert,
    color: "orange",
    unlockAt: 1,
    description: "If 2+ players choose the same number, that number is INVALID. Those players each lose -1 and are excluded from winning.",
    scoring: "Duplicates: -1 (invalid) · Remaining scored normally",
  },
  {
    id: "exact_penalty",
    name: "Rule 2: Double Penalty",
    icon: Target,
    color: "red",
    unlockAt: 2,
    description: "If a player guesses the EXACT target number, all OTHER players lose -2 instead of -1. The exact match winner gets -0.",
    scoring: "Exact winner: -0 · Others: -2",
  },
  {
    id: "zero_hundred",
    name: "Rule 3: Zero/Hundred Override",
    icon: Swords,
    color: "purple",
    unlockAt: 3,
    description: "Only when 2 players remain. You MUST pick 0, 1, or 100 — no other numbers allowed. Rock-paper-scissors decides: 100 beats 0, 0 beats 1, 1 beats 100. Same pick = tie (both lose −1).",
    scoring: "RPS Winner: +0 · Loser: −1 · Tie: −1 each",
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; icon: string; text: string; glow: string }> = {
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", icon: "bg-emerald-500/15 text-emerald-400", text: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(16,185,129,0.1)]" },
  orange:  { border: "border-orange-500/30",  bg: "bg-orange-500/5",  icon: "bg-orange-500/15 text-orange-400",  text: "text-orange-400",  glow: "shadow-[0_0_20px_rgba(249,115,22,0.1)]" },
  red:     { border: "border-red-500/30",     bg: "bg-red-500/5",     icon: "bg-red-500/15 text-red-400",     text: "text-red-400",     glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]" },
  purple:  { border: "border-purple-500/30",  bg: "bg-purple-500/5",  icon: "bg-purple-500/15 text-purple-400",  text: "text-purple-400",  glow: "shadow-[0_0_20px_rgba(168,85,247,0.1)]" },
};

export default function RulesOverview() {
  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-red-500 text-5xl font-black drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">♦</div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Game Rules</h2>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          New rules unlock progressively as players get eliminated. Study them before the game begins!
        </p>
      </div>

      {/* Rules cards */}
      <div className="space-y-3">
        {RULES.map((rule) => {
          const c = COLOR_MAP[rule.color];
          const Icon = rule.icon;
          return (
            <div
              key={rule.id}
              className={`rounded-xl border ${c.border} ${c.bg} ${c.glow} p-4 transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${c.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-white">{rule.name}</h3>
                    {"always" in rule ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-bold">
                        ALWAYS ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10 font-semibold">
                        🔒 After {rule.unlockAt} elimination{rule.unlockAt! > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{rule.description}</p>
                  <p className="text-[11px] text-zinc-600 font-mono">{rule.scoring}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick reference */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4 space-y-3">
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Quick Reference</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-black/30 rounded-lg p-3 border border-white/5">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-zinc-400">Winner</p>
            <p className="text-sm font-bold font-mono text-emerald-400">-0</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 border border-white/5">
            <Users className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
            <p className="text-xs text-zinc-400">Others</p>
            <p className="text-sm font-bold font-mono text-red-400">-1</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 border border-white/5">
            <Skull className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-zinc-400">Eliminated</p>
            <p className="text-sm font-bold font-mono text-red-400">≤ -10</p>
          </div>
        </div>
      </div>
    </div>
  );
}
