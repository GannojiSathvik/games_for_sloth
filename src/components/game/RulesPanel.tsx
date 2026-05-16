// src/components/game/RulesPanel.tsx
// Shows all three progressive rules with locked/unlocked state.
// Pure server component — no state needed.

import { GAME_RULES, RULE_UNLOCK_AT } from "@/lib/game-engine";

const RULE_META = [
  {
    id: GAME_RULES.DUPLICATE_GUARD,
    icon: "⚠️",
    title: "Rule 1 · Duplicate Guard",
    description:
      "Numbers chosen by 2+ players become INVALID. Those players each lose −1 and are excluded from the winner pool. Others score normally.",
    unlocksAfter: `${RULE_UNLOCK_AT.duplicate_guard}st elimination`,
  },
  {
    id: GAME_RULES.EXACT_PENALTY,
    icon: "💥",
    title: "Rule 2 · Double Penalty",
    description:
      "When a player hits the exact target, all OTHER players lose −2 instead of −1. (Duplicate override still takes precedence.)",
    unlocksAfter: `${RULE_UNLOCK_AT.exact_penalty}nd elimination`,
  },
  {
    id: GAME_RULES.ZERO_HUNDRED,
    icon: "⚔️",
    title: "Rule 3 · Zero / Hundred",
    description:
      "When only 2 players remain, a Rock-Paper-Scissors override activates: 100 beats 0 · 0 beats 1 · 1 beats 100. Applies only when both submit those specific numbers.",
    unlocksAfter: `${RULE_UNLOCK_AT.zero_hundred}rd elimination`,
  },
];

interface Props {
  activeRules: string[];
  eliminationCount: number;
}

export default function RulesPanel({ activeRules, eliminationCount }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl overflow-hidden">
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-100">Progressive Rules</p>
        <span className="text-xs text-zinc-500">{eliminationCount} eliminated</span>
      </div>
      <ul className="divide-y divide-white/5">
        {RULE_META.map((rule) => {
          const unlocked = activeRules.includes(rule.id);
          return (
            <li key={rule.id} className={`px-4 py-3 transition-colors ${unlocked ? "bg-orange-950/20" : "opacity-40"}`}>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5 flex-shrink-0">{rule.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs font-bold ${unlocked ? "text-orange-300" : "text-zinc-400"}`}>
                      {rule.title}
                    </p>
                    {unlocked ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-600">
                        🔒 after {rule.unlocksAfter}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{rule.description}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
