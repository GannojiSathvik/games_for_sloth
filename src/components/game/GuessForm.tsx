"use client";
// GuessForm — premium number pad with ripple, keyboard support, React.memo.

import { useActionState, useEffect, useRef, useCallback, memo, useState } from "react";
import { submitGuessAction } from "@/actions/game-actions";

interface Props { playerId: string; roundId: string; roomId: string; activeRules?: string[]; activePlayers?: number; }
const initialState = { success: false, error: undefined as string | undefined };

// ── Memoised Number Pad ───────────────────────────────────────────────────────
interface PadProps { value: string; disabled: boolean; onDigit(d: number): void; onClear(): void; onSubmit(): void; }

const NumberPad = memo(function NumberPad({ value, disabled, onDigit, onClear, onSubmit }: PadProps) {
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const fireRipple = (n: number) => {
    const el = btnRefs.current[n];
    if (!el) return;
    el.classList.remove("kod-btn-ripple");
    void el.offsetWidth;
    el.classList.add("kod-btn-ripple");
  };

  const handleDigit = (n: number) => { if (!disabled) { fireRipple(n); onDigit(n); } };

  return (
    <div className="space-y-3">
      {/* Value display */}
      <div className="w-full h-16 rounded-xl border border-white/10 bg-zinc-950/80
                      flex items-center justify-center font-mono text-4xl font-black tracking-widest"
           aria-live="polite">
        {value === ""
          ? <span className="text-zinc-700 text-2xl font-normal">0 – 100</span>
          : <span className="text-red-300">{value}</span>}
      </div>

      {/* 5 × 2 grid */}
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Number pad">
        {[1,2,3,4,5,6,7,8,9,0].map(n => (
          <button key={n}
            ref={el => { btnRefs.current[n] = el; }}
            type="button"
            onClick={() => handleDigit(n)}
            disabled={disabled}
            aria-label={`Digit ${n}`}
            className="h-14 rounded-lg border border-white/10 bg-zinc-900 text-white text-xl font-bold font-mono
                       hover:bg-zinc-700 hover:border-red-500/40 hover:shadow-[0_0_12px_rgba(220,38,38,0.3)]
                       active:scale-90 active:bg-zinc-950
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-75 will-change-transform
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >{n}</button>
        ))}
      </div>

      {/* Action row */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onClear}
          disabled={disabled || value === ""}
          className="h-12 rounded-xl border border-white/10 bg-zinc-900 text-zinc-400 font-semibold text-sm
                     hover:bg-zinc-800 hover:text-white active:scale-95
                     disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-75">
          ⌫ Clear
        </button>
        <button type="button" onClick={onSubmit}
          disabled={disabled || value === ""}
          className="h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-base
                     shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:shadow-[0_0_30px_rgba(220,38,38,0.55)]
                     active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-75">
          Submit ♦
        </button>
      </div>
    </div>
  );
}, (prev, next) => prev.disabled === next.disabled && prev.value === next.value);

// ── RPS Bubble Pad (2-player, zero_hundred mode) ──────────────────────────────
const RPS_OPTIONS = [
  { value: 0,   label: "0",   sublabel: "Beats 1",   bubble: "/bubble-1.webp", glow: "rgba(168,85,247,0.7)"  },
  { value: 1,   label: "1",   sublabel: "Beats 100", bubble: "/bubble-2.webp", glow: "rgba(251,146,60,0.7)"  },
  { value: 100, label: "100", sublabel: "Beats 0",   bubble: "/bubble-3.webp", glow: "rgba(56,189,248,0.7)"  },
];

interface RpsPadProps { selected: string; disabled: boolean; onSelect(v: number): void; onSubmit(): void; }

const RpsPad = memo(function RpsPad({ selected, disabled, onSelect, onSubmit }: RpsPadProps) {
  return (
    <div className="space-y-5">
      {/* Float keyframe injected once */}
      <style>{`
        @keyframes rps-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-7px) rotate(1deg); }
          66%       { transform: translateY(-3px) rotate(-1deg); }
        }
      `}</style>

      {/* Header banner */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-zinc-950/80 to-blue-950/40 px-4 py-3 text-center space-y-0.5 backdrop-blur-sm">
        <p className="text-[11px] text-purple-300 uppercase tracking-[0.25em] font-black">⚔️ Rule 3 — 2 Players Remain</p>
        <p className="text-base text-white font-bold">Choose Your Bubble</p>
        <p className="text-xs text-zinc-500">100 beats 0 · 0 beats 1 · 1 beats 100</p>
      </div>

      {/* Selected display */}
      <div
        aria-live="polite"
        className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300"
        style={{
          background: selected !== "" ? "rgba(168,85,247,0.08)" : "transparent",
          border: selected !== "" ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {selected === "" ? (
          <span className="text-zinc-600 text-sm font-medium tracking-widest animate-pulse">Tap a bubble…</span>
        ) : (
          <>
            <span className="text-zinc-400 text-sm">You picked:</span>
            <span
              className="text-3xl font-black font-mono text-white"
              style={{ textShadow: "0 0 22px rgba(168,85,247,0.9), 0 0 50px rgba(168,85,247,0.4)" }}
            >
              {selected}
            </span>
          </>
        )}
      </div>

      {/* Bubble buttons */}
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="RPS options">
        {RPS_OPTIONS.map((opt, idx) => {
          const isSelected = selected === String(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { if (!disabled) onSelect(opt.value); }}
              disabled={disabled}
              aria-label={`Pick ${opt.label}`}
              className={`relative flex flex-col items-center justify-center aspect-square
                bg-transparent border-none outline-none p-0 rounded-full
                transition-transform duration-200 will-change-transform
                disabled:opacity-40 disabled:cursor-not-allowed
                ${isSelected ? "scale-[1.15]" : "hover:scale-[1.08] active:scale-95"}`}
              style={{
                filter: isSelected
                  ? `drop-shadow(0 0 16px ${opt.glow}) drop-shadow(0 0 32px ${opt.glow})`
                  : "drop-shadow(0 0 3px rgba(255,255,255,0.2))",
                animation: isSelected
                  ? "none"
                  : `rps-float ${3 + idx * 0.7}s ease-in-out ${idx * 0.9}s infinite`,
              }}
            >
              {/* Bubble image as background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.bubble}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none rounded-full"
                style={{ 
                  opacity: isSelected ? 1 : 0.72, 
                  transition: "opacity 0.25s",
                  mixBlendMode: "screen" // Drops any black rectangular background from the webp
                }}
              />

              {/* Number */}
              <span
                className="relative z-10 font-black font-mono leading-none select-none"
                style={{
                  fontSize: opt.value === 100 ? "1.55rem" : "2.1rem",
                  color: "#ffffff",
                  textShadow: isSelected
                    ? `0 0 14px ${opt.glow}, 0 0 28px ${opt.glow}, 0 2px 6px rgba(0,0,0,0.95)`
                    : "0 2px 8px rgba(0,0,0,0.95), 0 0 1px rgba(0,0,0,1)",
                }}
              >
                {opt.label}
              </span>

              {/* Sublabel */}
              <span
                className="relative z-10 text-[9px] font-bold tracking-wider uppercase mt-0.5 select-none"
                style={{
                  color: isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
                  textShadow: "0 1px 5px rgba(0,0,0,1)",
                }}
              >
                {opt.sublabel}
              </span>

              {/* Selected pulse ring */}
              {isSelected && (
                <span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: `0 0 0 3px ${opt.glow}`,
                    animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
                    borderRadius: "50%",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || selected === ""}
        className="w-full h-12 rounded-2xl text-white font-black text-base
                   active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-200"
        style={{
          background: selected !== ""
            ? "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #db2777 100%)"
            : "rgba(39,39,42,0.7)",
          boxShadow: selected !== ""
            ? "0 0 28px rgba(168,85,247,0.55), 0 0 60px rgba(192,38,211,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
            : "none",
          border: selected !== ""
            ? "1px solid rgba(168,85,247,0.6)"
            : "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {selected !== "" ? `Submit ${selected} ♦` : "Tap a bubble first"}
      </button>
    </div>
  );
}, (prev, next) => prev.disabled === next.disabled && prev.selected === next.selected);

// ── Main GuessForm ────────────────────────────────────────────────────────────
export default function GuessForm({ playerId, roundId, roomId, activeRules = [], activePlayers = 99 }: Props) {
  // RPS bubble mode: whenever exactly 2 players remain, force 0/1/100 picks.
  // This is independent of whether Rule 3 is formally "unlocked".
  const isRpsMode = activePlayers === 2;
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, fd: FormData) => {
      const r = await submitGuessAction(fd);
      return { success: r.success, error: r.error };
    },
    initialState,
  );

  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const appendDigit = useCallback((d: number) => {
    setValue(prev => {
      const next = prev + String(d);
      const n = parseInt(next, 10);
      if (n > 100) return prev;
      return String(n); // remove leading zeros
    });
  }, []);

  const handleClear  = useCallback(() => setValue(""), []);

  const handleSubmit = useCallback(() => {
    const n = parseInt(value, 10);
    if (value === "" || isNaN(n) || n < 0 || n > 100) return;
    const hidden = formRef.current?.querySelector<HTMLInputElement>('[name="guess"]');
    if (hidden) hidden.value = value;
    formRef.current?.requestSubmit();
  }, [value]);

  // RPS direct-select handler
  const handleRpsSelect = useCallback((v: number) => {
    setValue(String(v));
  }, []);

  // Keyboard support — no re-renders, reads latest value via closure
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPending || state.success) return;
      if (!isRpsMode) {
        if (e.key >= "0" && e.key <= "9") appendDigit(parseInt(e.key, 10));
        if (e.key === "Backspace") handleClear();
      }
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPending, state.success, appendDigit, handleClear, handleSubmit, isRpsMode]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-center gap-4 kod-fade-in">
        <span className="text-4xl">✅</span>
        <div>
          <p className="text-emerald-400 font-bold text-lg">Guess submitted!</p>
          <p className="text-zinc-500 text-sm">Waiting for other players…</p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="roundId"  value={roundId}  />
      <input type="hidden" name="roomId"   value={roomId}   />
      <input type="hidden" name="guess"    defaultValue=""  />

      {isRpsMode ? (
        <RpsPad
          selected={value}
          disabled={isPending}
          onSelect={handleRpsSelect}
          onSubmit={handleSubmit}
        />
      ) : (
        <NumberPad
          value={value}
          disabled={isPending}
          onDigit={appendDigit}
          onClear={handleClear}
          onSubmit={handleSubmit}
        />
      )}

      {!isRpsMode && (
        <p className="text-xs text-zinc-700 text-center">
          Target = 80% of average · Closest wins · Type or click pad
        </p>
      )}

      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-sm text-red-400 kod-fade-in">
          ⚠ {state.error}
        </div>
      )}
    </form>
  );
}
