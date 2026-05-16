"use client";
// RuleAnnouncement — full-screen overlay shown when a new progressive rule unlocks.
// Slides in from top, gold border pulses, shows countdown to next round.

import { useEffect, useRef, memo } from "react";

const RULE_META: Record<string, { icon: string; title: string; body: string }> = {
  duplicate_guard: {
    icon: "⚠️",
    title: "Rule 1: Duplicate Invalidity",
    body: "If 2 or more players choose the same number, that number becomes INVALID.\nAll players who chose it lose −1 point and are excluded from the winner pool.\nOther players score normally.",
  },
  exact_penalty: {
    icon: "💥",
    title: "Rule 2: Double Penalty",
    body: "When a player hits the exact target number, the winner keeps +0.\nBut ALL other players now lose −2 instead of −1.\nIf the exact number is also a duplicate, Rule 1 takes precedence.",
  },
  zero_hundred: {
    icon: "⚔️",
    title: "Rule 3: Zero / Hundred Override",
    body: "With only 2 players remaining, a Rock-Paper-Scissors override activates:\n  100 beats 0 · 0 beats 1 · 1 beats 100\nOnly triggers on those specific pairings. Otherwise normal calculation applies.",
  },
};

interface Props {
  newRuleId: string;
  deadlineIso: string; // When the extended 5-min round ends
}

export default memo(function RuleAnnouncement({ newRuleId, deadlineIso }: Props) {
  const rule = RULE_META[newRuleId];
  const timerRef = useRef<HTMLSpanElement>(null);

  // DOM-direct countdown (zero state re-renders)
  useEffect(() => {
    const deadlineMs = new Date(deadlineIso).getTime();
    const tick = () => {
      const rem = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      if (timerRef.current) {
        timerRef.current.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadlineIso]);

  if (!rule) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="alertdialog"
      aria-label={`New rule: ${rule.title}`}
    >
      <div
        className="kod-rule-panel mx-4 max-w-lg w-full rounded-2xl border-2 border-yellow-400/70
                   bg-zinc-900/95 p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{rule.icon}</span>
          <div>
            <p className="text-[10px] text-yellow-600 uppercase tracking-widest font-semibold">
              New Rule Activated
            </p>
            <h2 className="text-yellow-300 text-xl font-black tracking-wide">
              {rule.title}
            </h2>
          </div>
        </div>

        {/* Rule body */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/20 p-4">
          {rule.body.split("\n").map((line, i) => (
            <p key={i} className={`text-sm leading-relaxed ${line.startsWith(" ") ? "text-yellow-200 font-semibold mt-1 ml-2" : "text-zinc-300"}`}>
              {line}
            </p>
          ))}
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <p className="text-zinc-400 text-sm">
            Round starts in{" "}
            <span
              ref={timerRef}
              className="font-mono font-black text-yellow-300 text-lg tabular-nums"
            >
              05:00
            </span>
          </p>
        </div>

        <p className="text-center text-xs text-zinc-700">
          Study the rule carefully — the next round uses it
        </p>
      </div>
    </div>
  );
});
