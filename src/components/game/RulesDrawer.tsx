"use client";

import { useState } from "react";
import { X, HelpCircle, AlertTriangle, Users, Target, ShieldAlert } from "lucide-react";
import { GAME_RULES } from "@/lib/game-engine";

export default function RulesDrawer({ activeRules, eliminationCount }: { activeRules: string[], eliminationCount: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white transition-colors border border-white/10"
      >
        <HelpCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Rules</span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-[401] w-full max-w-sm bg-zinc-950 border-l border-white/10 transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-400" />
            <h2 className="text-xl font-bold text-white">Progressive Rules</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-red-950/30 border border-red-500/20 p-4 rounded-xl mb-6">
            <p className="text-sm text-red-400 flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" /> Total Eliminations
            </p>
            <p className="text-3xl font-black font-mono text-white">{eliminationCount}</p>
            <p className="text-xs text-zinc-500 mt-2">More rules unlock as players die.</p>
          </div>

          <div className="space-y-4">
            {[
              { id: "duplicate_guard", name: "Rule 1: Duplicate Guard", unlockThreshold: 1, description: "If 2+ players choose the same number, that number is invalid and they lose 1 point." },
              { id: "exact_penalty", name: "Rule 2: Exact Match Penalty", unlockThreshold: 2, description: "If a player exactly guesses the target number, all other players lose 2 points instead of 1." },
              { id: "zero_hundred", name: "Rule 3: The 0 vs 100", unlockThreshold: 3, description: "When exactly 2 players remain: 0 beats 100, 100 beats 1, 1 beats 0." }
            ].map((rule) => {
              const isActive = activeRules.includes(rule.id);
              const Icon = getRuleIcon(rule.id);
              
              return (
                <div 
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive 
                      ? "bg-zinc-900 border-white/20" 
                      : "bg-black/50 border-white/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${isActive ? "bg-white/10 text-white" : "bg-black text-zinc-600"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${isActive ? "text-white" : "text-zinc-500"}`}>
                        {rule.name}
                      </h3>
                      <p className="text-xs text-zinc-500">Unlocks at {rule.unlockThreshold} eliminations</p>
                    </div>
                  </div>
                  {isActive ? (
                    <p className="text-sm text-zinc-300">{rule.description}</p>
                  ) : (
                    <div className="text-sm text-zinc-600 bg-zinc-900/50 p-2 rounded flex items-center justify-center gap-2 mt-2">
                      <span>🔒</span> Locked
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function getRuleIcon(id: string) {
  switch (id) {
    case "duplicate_guard": return ShieldAlert;
    case "exact_penalty": return Target;
    case "0_100_reversal": return AlertTriangle;
    default: return HelpCircle;
  }
}
