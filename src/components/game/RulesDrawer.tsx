"use client";

import { useState } from "react";
import { X, HelpCircle, AlertTriangle, Target, ShieldAlert, Swords } from "lucide-react";

const ALL_RULES = [
  {
    id: "duplicate_guard",
    name: "Rule 1: Duplicate Guard",
    icon: ShieldAlert,
    unlockAt: 1,
    unlockLabel: "After 1st elimination",
    color: "orange",
    description: "If 2 or more players choose the same number, that number is INVALID. All those players lose -1 and are excluded from winning. Normal scoring applies to the rest.",
    example: "Guesses: 23, 23, 45 → 23 is invalid. Both players with 23 get -1. Player with 45 wins (-0).",
  },
  {
    id: "exact_penalty",
    name: "Rule 2: Double Penalty",
    icon: Target,
    unlockAt: 2,
    unlockLabel: "After 2nd elimination",
    color: "red",
    description: "If any player guesses the EXACT target number, all OTHER players lose -2 instead of -1. The exact match winner still gets -0.",
    example: "Target: 23.2 ≈ 23. Player with 23 wins (-0). All others lose -2.",
  },
  {
    id: "zero_hundred",
    name: "Rule 3: Zero / Hundred Override",
    icon: Swords,
    unlockAt: 3,
    unlockLabel: "After 3rd elimination",
    color: "purple",
    description: "ONLY active when exactly 2 players remain. Special rock-paper-scissors: 100 beats 0 · 0 beats 1 · 1 beats 100. If this combo doesn't apply, normal rules run.",
    example: "Player A: 0, Player B: 100 → Player B wins (100 beats 0).",
  },
];

const COLORS = {
  orange: { ring: "border-orange-500/40", bg: "bg-orange-950/20", icon: "bg-orange-500/20 text-orange-400", badge: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  red:    { ring: "border-red-500/40",    bg: "bg-red-950/20",    icon: "bg-red-500/20 text-red-400",    badge: "bg-red-500/20 text-red-300 border-red-500/30" },
  purple: { ring: "border-purple-500/40", bg: "bg-purple-950/20", icon: "bg-purple-500/20 text-purple-400", badge: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
};

export default function RulesDrawer({ activeRules, eliminationCount }: { activeRules: string[]; eliminationCount: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const nextUnlock = ALL_RULES.find(r => !activeRules.includes(r.id));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white transition-colors border border-white/10"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Rules</span>
        {activeRules.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {activeRules.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-[401] w-full max-w-sm bg-zinc-950 border-l border-white/10 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-bold text-white">Progressive Rules</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Elimination counter */}
        <div className="mx-5 mt-5 bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Total Eliminations</p>
            <p className="text-4xl font-black font-mono text-white mt-1">{eliminationCount}</p>
          </div>
          <div className="text-right">
            {nextUnlock ? (
              <>
                <p className="text-xs text-zinc-500">Next rule unlocks at</p>
                <p className="text-2xl font-black font-mono text-yellow-400">{nextUnlock.unlockAt}</p>
                <p className="text-xs text-zinc-600">elimination{nextUnlock.unlockAt > 1 ? "s" : ""}</p>
              </>
            ) : (
              <p className="text-xs text-emerald-400 font-semibold">All rules active!</p>
            )}
          </div>
        </div>

        {/* Rules list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {ALL_RULES.map((rule) => {
            const isActive = activeRules.includes(rule.id);
            const Icon = rule.icon;
            const c = COLORS[rule.color as keyof typeof COLORS];

            return (
              <div
                key={rule.id}
                className={`rounded-xl border p-4 transition-all ${isActive ? `${c.ring} ${c.bg}` : "border-white/5 bg-black/30 opacity-50"}`}
              >
                {/* Rule header */}
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${isActive ? c.icon : "bg-zinc-900 text-zinc-600"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold text-sm ${isActive ? "text-white" : "text-zinc-500"}`}>{rule.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${isActive ? c.badge : "bg-zinc-900 text-zinc-600 border-white/5"}`}>
                        {isActive ? "✓ ACTIVE" : `🔒 ${rule.unlockLabel}`}
                      </span>
                    </div>
                    <p className={`text-xs mt-2 leading-relaxed ${isActive ? "text-zinc-300" : "text-zinc-600"}`}>
                      {rule.description}
                    </p>
                    {isActive && (
                      <div className="mt-3 bg-black/30 rounded-lg p-2.5 border border-white/5">
                        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Example</p>
                        <p className="text-[11px] text-zinc-400">{rule.example}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scoring legend */}
          <div className="mt-2 bg-zinc-900/60 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-3">Base Scoring (No Rules)</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">👑 Winner (closest)</span>
                <span className="text-zinc-400 font-mono font-bold">-0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Others</span>
                <span className="text-red-400 font-mono font-bold">-1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Skip / No submit</span>
                <span className="text-red-400 font-mono font-bold">-1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">3 consecutive skips</span>
                <span className="text-red-500 font-mono font-bold">ELIMINATED</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Elimination threshold</span>
                <span className="text-red-400 font-mono font-bold">≤ -10 points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
