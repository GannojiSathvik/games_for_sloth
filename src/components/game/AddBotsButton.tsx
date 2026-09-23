"use client";

import { useActionState } from "react";
import { addBotsAction } from "@/actions/game-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Check } from "lucide-react";

interface Props { roomId: string; }

const initial = { added: 0, error: "" };

export default function AddBotsButton({ roomId }: Props) {
  const [state, action, isPending] = useActionState(
    async (_prev: typeof initial, fd: FormData) => {
      const count = Math.max(1, Math.min(20, parseInt(fd.get("botCount") as string, 10) || 1));
      try {
        // The server re-checks the host, the room status and the room's
        // capacity — this clamp is only so the button feels right.
        const result = await addBotsAction(roomId, count);
        return { added: result.added, error: result.error ?? "" };
      } catch {
        // Never surface the raw error: it is a server stack trace, which tells
        // the player nothing and tells an attacker about the internals.
        return { added: 0, error: "Could not reach the server. Try again." };
      }
    },
    initial,
  );

  return (
    <form action={action} className="space-y-2">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="botCount" className="text-xs font-medium text-zinc-400">
            Add AI opponents
          </Label>
          <Input
            id="botCount"
            name="botCount"
            type="number"
            min="1"
            max="20"
            defaultValue="1"
            disabled={isPending}
            className="h-10 border-white/10 bg-zinc-900 text-white"
          />
        </div>
        <Button
          type="submit"
          disabled={isPending}
          variant="outline"
          className="h-10 gap-1.5 border-zinc-700 px-5 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          <Bot className="h-4 w-4" />
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Feedback sits on its own line so the row never reflows mid-click. */}
      <div aria-live="polite" className="min-h-[1.25rem]">
        {state.added > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <Check className="h-3 w-3" />
            {state.added} bot{state.added > 1 ? "s" : ""} joined the table
          </span>
        )}
        {state.error && <span className="text-xs text-red-400">⚠ {state.error}</span>}
      </div>
    </form>
  );
}
