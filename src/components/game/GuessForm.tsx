"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitGuessAction } from "@/actions/game-actions";

interface Props {
  playerId: string;
  roundId: string;
  roomId: string;
}

const initialState = { success: false, error: undefined as string | undefined };

export default function GuessForm({ playerId, roundId, roomId }: Props) {
  const [state, action, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await submitGuessAction(formData);
      return { success: result.success, error: result.error };
    },
    initialState
  );

  const inputRef = useRef<HTMLInputElement>(null);

  // Clear input on success
  useEffect(() => {
    if (state.success && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [state.success]);

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-center gap-4 animate-in fade-in duration-300">
        <span className="text-4xl">✅</span>
        <div>
          <p className="text-emerald-400 font-bold text-lg">Guess submitted!</p>
          <p className="text-zinc-500 text-sm">Waiting for other players… Round resolves when all submit or timer runs out.</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="roundId"  value={roundId}  />
      <input type="hidden" name="roomId"   value={roomId}   />

      <div className="space-y-3">
        <Label htmlFor="guess-input" className="text-zinc-300 font-medium text-base">
          Your Guess <span className="text-zinc-600 font-normal">(0 – 100)</span>
        </Label>
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            id="guess-input"
            name="guess"
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="Enter 0 – 100"
            disabled={isPending}
            className="flex-1 bg-zinc-900/80 border-white/10 text-white text-2xl font-mono h-16 focus-visible:ring-red-500 tracking-wider"
          />
          <Button
            type="submit"
            disabled={isPending}
            className="bg-red-600 hover:bg-red-500 active:scale-95 text-white px-8 h-16 font-bold text-lg shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-all disabled:opacity-60"
          >
            {isPending ? "…" : "Submit ♦"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-600">Target = 80% of average of all guesses. Closest wins.</p>
          <p className="text-xs text-zinc-700">Leave blank = skip (−1 penalty)</p>
        </div>

        {state.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-sm text-red-400">
            ⚠ {state.error}
          </div>
        )}
      </div>
    </form>
  );
}
