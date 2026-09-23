"use client";

// GameSettingsPanel — the host's lobby controls for elimination score and round
// timer, plus the Start button.
//
// The settings write to the room as soon as they change, rather than only when
// Start is pressed. Two reasons: everyone else in the lobby is reading the same
// room row, so they see the real rules before they commit to playing; and the
// rules summary above this panel stops promising numbers that are about to be
// replaced.

import { useState, useTransition } from "react";
import { updateGameSettingsAction, startGameWithSettings } from "@/actions/game-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Skull, Timer } from "lucide-react";

const ELIMINATION_OPTIONS = [
  { value: -3, label: "−3", hint: "Fast" },
  { value: -5, label: "−5", hint: "Short" },
  { value: -10, label: "−10", hint: "Standard" },
  { value: -15, label: "−15", hint: "Long" },
  { value: -20, label: "−20", hint: "Marathon" },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15s", hint: "Blitz" },
  { value: 30, label: "30s", hint: "Default" },
  { value: 45, label: "45s", hint: "Relaxed" },
  { value: 60, label: "60s", hint: "Slow" },
];

interface Props {
  roomId: string;
  eliminationScore: number;
  roundDuration: number;
}

/** A row of segmented buttons — one tap per choice, no dropdown to open. */
function OptionRow<T extends number>({
  options,
  selected,
  onSelect,
  disabled,
  name,
}: {
  options: Array<{ value: T; label: string; hint: string }>;
  selected: T;
  onSelect: (v: T) => void;
  disabled: boolean;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(opt.value)}
            className={`rounded-lg border px-2 py-2 text-center transition-all disabled:opacity-50 ${
              active
                ? "border-red-500/60 bg-red-950/40 text-white shadow-[0_0_14px_rgba(220,38,38,0.2)]"
                : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            <span className="block font-mono text-sm font-bold">{opt.label}</span>
            <span className={`block text-[10px] ${active ? "text-red-300/80" : "text-zinc-600"}`}>
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function GameSettingsPanel({ roomId, eliminationScore, roundDuration }: Props) {
  // Seeded from the server row, then held locally so a click feels instant
  // while the write is in flight. The poller re-renders this component with the
  // saved value shortly after, which is what keeps the two in step.
  const [elim, setElim] = useState(eliminationScore);
  const [duration, setDuration] = useState(roundDuration);
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();

  function save(patch: { eliminationScore?: number; roundDuration?: number }) {
    setError("");
    startSaving(async () => {
      const result = await updateGameSettingsAction(roomId, patch);
      if (!result.ok) {
        setError(result.error ?? "Could not save that setting.");
        // Snap back to the server's values so the UI never claims a setting
        // that was rejected.
        setElim(eliminationScore);
        setDuration(roundDuration);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        You are the <span className="font-semibold text-yellow-400">host</span>. Needs at least 2
        players — bots fill the empty seats.
      </p>

      <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-950/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Game Settings
          </p>
          <span
            aria-live="polite"
            className={`text-[10px] transition-opacity ${isSaving ? "text-zinc-500 opacity-100" : "opacity-0"}`}
          >
            Saving…
          </span>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Skull className="h-3.5 w-3.5 text-red-500" />
            Eliminated at
          </Label>
          <OptionRow
            name="Elimination score"
            options={ELIMINATION_OPTIONS}
            selected={elim}
            disabled={isSaving}
            onSelect={(v) => { setElim(v); save({ eliminationScore: v }); }}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Timer className="h-3.5 w-3.5 text-sky-400" />
            Round timer
          </Label>
          <OptionRow
            name="Round timer"
            options={DURATION_OPTIONS}
            selected={duration}
            disabled={isSaving}
            onSelect={(v) => { setDuration(v); save({ roundDuration: v }); }}
          />
        </div>

        {error && <p className="text-xs text-red-400">⚠ {error}</p>}
      </div>

      {/*
        The settings are already saved, but they ride along in the form too so
        Start remains correct if a click was still in flight — and so the lobby
        keeps working with JavaScript disabled.
      */}
      <form action={startGameWithSettings}>
        <input type="hidden" name="roomId" value={roomId} />
        <input type="hidden" name="elimScore" value={elim} />
        <input type="hidden" name="roundDuration" value={duration} />
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full gap-2 bg-red-600 text-base font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.25)] hover:bg-red-500"
        >
          <Play className="h-4 w-4 fill-current" />
          Start Game
        </Button>
      </form>
    </div>
  );
}
