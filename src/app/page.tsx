"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createRoomAction, joinRoomAction } from "@/actions/room-actions";

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full bg-red-600 text-white hover:bg-red-500 active:scale-95 transition-transform disabled:opacity-60"
    >
      {pending ? `${label}…` : label}
    </Button>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<"create" | "join">("create");

  const [createState, createAction, createPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createRoomAction(formData);
        return null;
      } catch (e: unknown) {
        return e instanceof Error ? e.message : "Failed to create room.";
      }
    },
    null
  );

  const [joinState, joinAction, joinPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await joinRoomAction(formData);
        return null;
      } catch (e: unknown) {
        return e instanceof Error ? e.message : "Failed to join room.";
      }
    },
    null
  );

  const error = tab === "create" ? createState : joinState;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4">
      {/* ── Ambient glow ───────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[600px] rounded-full bg-red-600/20 blur-[120px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-[300px] w-[300px] rounded-full bg-yellow-500/10 blur-[100px]" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative mb-10 flex flex-col items-center gap-3 text-center">
        <Badge variant="outline" className="border-red-500/40 bg-red-950/40 text-red-400 backdrop-blur">
          ♦ Alice in Borderland
        </Badge>
        <h1 className="bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-6xl font-black tracking-tight text-transparent sm:text-7xl">
          King of Diamonds
        </h1>
        <p className="max-w-md text-lg text-zinc-400">
          Guess <span className="font-semibold text-red-400">80% of the average</span>. Get closest — or get eliminated.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          {[
            { label: "Closest guess", delta: "+1 / −1", color: "text-emerald-400 border-emerald-700/40 bg-emerald-950/40" },
            { label: "Exact match",   delta: "+2 / −2", color: "text-yellow-400 border-yellow-700/40 bg-yellow-950/40" },
            { label: "Score ≤ −10",   delta: "Eliminated", color: "text-red-400 border-red-700/40 bg-red-950/40" },
          ].map((r) => (
            <span key={r.label} className={`rounded-full border px-3 py-1 backdrop-blur ${r.color}`}>
              {r.label} → <strong>{r.delta}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <Card className="relative w-full max-w-md border border-white/10 bg-zinc-900/70 shadow-2xl backdrop-blur-xl">
        {/* Tab switcher */}
        <div className="flex border-b border-white/10">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold tracking-wide transition-colors ${
                tab === t ? "border-b-2 border-red-500 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "create" ? "🎲 Create Room" : "🚪 Join Room"}
            </button>
          ))}
        </div>

        <CardContent className="p-6">
          {tab === "create" ? (
            <form action={createAction} className="flex flex-col gap-4">
              <CardHeader className="p-0">
                <CardTitle className="text-white">Start a new game</CardTitle>
                <CardDescription className="text-zinc-400">
                  You&apos;ll be the host. Share the room code with friends.
                </CardDescription>
              </CardHeader>
              <Separator className="bg-white/10" />
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-username" className="text-zinc-300">Username</Label>
                <Input
                  id="create-username"
                  name="username"
                  placeholder="Enter your name"
                  required
                  className="border-white/10 bg-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
              <SubmitButton label="Create Room" pending={createPending} />
            </form>
          ) : (
            <form action={joinAction} className="flex flex-col gap-4">
              <CardHeader className="p-0">
                <CardTitle className="text-white">Join a game</CardTitle>
                <CardDescription className="text-zinc-400">
                  Enter the room code given by the host.
                </CardDescription>
              </CardHeader>
              <Separator className="bg-white/10" />
              <div className="flex flex-col gap-2">
                <Label htmlFor="join-username" className="text-zinc-300">Username</Label>
                <Input
                  id="join-username"
                  name="username"
                  placeholder="Enter your name"
                  required
                  className="border-white/10 bg-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="room-code" className="text-zinc-300">Room Code</Label>
                <Input
                  id="room-code"
                  name="roomCode"
                  placeholder="e.g. AK47X2"
                  required
                  maxLength={8}
                  className="border-white/10 bg-zinc-800 font-mono text-xl tracking-widest text-white placeholder:text-zinc-600 uppercase"
                  style={{ textTransform: "uppercase" }}
                />
              </div>
              <SubmitButton label="Join Room" pending={joinPending} />
            </form>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-400">
              ⚠ {error}
            </p>
          )}
        </CardContent>
      </Card>

      <p className="relative mt-8 text-xs text-zinc-600">
        ♦ = 10 · Based on the game from Alice in Borderland
      </p>
    </main>
  );
}
