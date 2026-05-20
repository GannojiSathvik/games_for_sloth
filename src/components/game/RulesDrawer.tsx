"use client";

// RulesDrawer.tsx -> Now a beautiful dropdown/popover menu.
// Positioned directly below the "Rules" button in the navbar.
// Responsive, scrollable, and features smooth animations.

import { useState } from "react";
import { HelpCircle, AlertTriangle, Target, ShieldAlert, Swords } from "lucide-react";

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
  orange: { ring: "border-orange-500/20", bg: "bg-orange-500/5", icon: "bg-orange-500/10 text-orange-400", badge: "bg-orange-500/10 text-orange-300 border-orange-500/20" },
  red:    { ring: "border-red-500/20",    bg: "bg-red-500/5",    icon: "bg-red-500/10 text-red-400",    badge: "bg-red-500/10 text-red-300 border-red-500/20" },
  purple: { ring: "border-purple-500/20", bg: "bg-purple-500/5", icon: "bg-purple-500/10 text-purple-400", badge: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
};

export default function RulesDrawer({ activeRules, eliminationCount }: { activeRules: string[]; eliminationCount: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const nextUnlock = ALL_RULES.find(r => !activeRules.includes(r.id));

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white transition-all border border-white/10 ${
          isOpen ? "bg-zinc-800/80 border-white/20" : "bg-zinc-800/40 hover:bg-zinc-800/60"
        }`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-semibold">Rules</span>
        {activeRules.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
            {activeRules.length}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          {/* Transparent Backdrop to close clicking outside */}
          <div
            className="fixed inset-0 z-[100] cursor-default"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel Container */}
          <div className="absolute right-0 mt-2 z-[101] w-[340px] sm:w-[380px] bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span className="font-bold text-sm text-zinc-200">Rule Reference</span>
              </div>
              <div className="text-xs font-semibold text-zinc-500">
                Eliminations: <span className="font-bold font-mono text-zinc-300">{eliminationCount}</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 space-y-4 max-h-[50vh]">
              {ALL_RULES.map((rule) => {
                const isActive = activeRules.includes(rule.id);
                const Icon = rule.icon;
                const c = COLORS[rule.color as keyof typeof COLORS];

                return (
                  <div
                    key={rule.id}
                    className={`rounded-lg border p-3 transition-all ${
                      isActive ? `${c.ring} ${c.bg}` : "border-white/5 bg-black/20 opacity-40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded flex-shrink-0 ${isActive ? c.icon : "bg-zinc-900 text-zinc-600"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-xs ${isActive ? "text-zinc-100" : "text-zinc-500"}`}>
                            {rule.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                            isActive ? c.badge : "bg-zinc-900 text-zinc-600 border-white/5"
                          }`}>
                            {isActive ? "ACTIVE" : `LOCKED`}
                          </span>
                        </div>
                        <p className={`text-xs mt-1.5 leading-relaxed ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                          {rule.description}
                        </p>
                        {isActive && (
                          <div className="mt-2 bg-black/30 rounded p-2 border border-white/5 text-[11px]">
                            <span className="text-zinc-500 font-bold block uppercase tracking-wider mb-0.5">Example</span>
                            <span className="text-zinc-400 block">{rule.example}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Scoring Legend */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider block mb-2">Base Scoring</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">👑 Round Winner</span>
                    <span className="text-emerald-400 font-mono font-bold">-0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Other Guesses</span>
                    <span className="text-red-400 font-mono font-bold">-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Skipped/No Submit</span>
                    <span className="text-red-400 font-mono font-bold">-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">3 Skips in a row</span>
                    <span className="text-red-500 font-mono font-bold">ELIMINATED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / Status */}
            <div className="p-3 bg-zinc-900/50 border-t border-white/10 text-center text-xs text-zinc-500">
              {nextUnlock ? (
                <span>
                  Next rule unlocks after <span className="font-bold text-yellow-500">{nextUnlock.unlockAt}</span> elimination(s).
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">All rules are currently active!</span>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
