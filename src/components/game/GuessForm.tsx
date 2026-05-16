"use client";
// GuessForm — premium number pad with ripple, keyboard support, React.memo.

import { useActionState, useEffect, useRef, useCallback, memo, useState } from "react";
import { submitGuessAction } from "@/actions/game-actions";

interface Props { playerId: string; roundId: string; roomId: string; }
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

// ── Main GuessForm ────────────────────────────────────────────────────────────
export default function GuessForm({ playerId, roundId, roomId }: Props) {
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

  // Keyboard support — no re-renders, reads latest value via closure
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPending || state.success) return;
      if (e.key >= "0" && e.key <= "9") appendDigit(parseInt(e.key, 10));
      if (e.key === "Backspace") handleClear();
      if (e.key === "Enter") handleSubmit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPending, state.success, appendDigit, handleClear, handleSubmit]);

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

      <NumberPad
        value={value}
        disabled={isPending}
        onDigit={appendDigit}
        onClear={handleClear}
        onSubmit={handleSubmit}
      />

      <p className="text-xs text-zinc-700 text-center">
        Target = 80% of average · Closest wins · Skip = −1 · Type or click pad
      </p>

      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-sm text-red-400 kod-fade-in">
          ⚠ {state.error}
        </div>
      )}
    </form>
  );
}
