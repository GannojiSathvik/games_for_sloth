"use client";

import { useActionState } from "react";
import { addAIPlayers } from "@/actions/game-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props { roomId: string; }

const initial = { success: false, error: "", added: 0 };

export default function AddBotsButton({ roomId }: Props) {
  const [state, action, isPending] = useActionState(
    async (_prev: typeof initial, fd: FormData) => {
      const raw   = fd.get("botCount");
      const count = Math.max(1, Math.min(20, parseInt(raw as string) || 3));
      try {
        await addAIPlayers(roomId, count);
        return { success: true, error: "", added: count };
      } catch (e) {
        return { success: false, error: String(e), added: 0 };
      }
    },
    initial
  );

  return (
    <form action={action} className="flex gap-3 items-end">
      <div className="flex-1 space-y-1">
        <Label htmlFor="botCount" className="text-xs text-zinc-500">Add AI Bots (1-20)</Label>
        <Input
          id="botCount"
          name="botCount"
          type="number"
          min="1"
          max="20"
          defaultValue="3"
          disabled={isPending}
          className="bg-zinc-900 border-white/10 text-white h-10"
        />
      </div>
      <Button
        type="submit"
        disabled={isPending}
        variant="outline"
        className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 h-10 px-5 disabled:opacity-50"
      >
        {isPending ? "Adding…" : "🤖 Add"}
      </Button>
      {state.success && state.added > 0 && (
        <span className="text-xs text-emerald-500 self-end pb-2">+{state.added} bots added!</span>
      )}
      {state.error && (
        <span className="text-xs text-red-500 self-end pb-2">Error: {state.error}</span>
      )}
    </form>
  );
}
