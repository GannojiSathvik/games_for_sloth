// src/app/join/[roomId]/page.tsx
import { db } from "@/db";
import { gameRooms, players, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { joinByLinkAction } from "@/actions/join-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { roomId } = await params;
  const { error }  = await searchParams;

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4 text-white">
        <p className="text-red-500 text-2xl font-bold">This room doesn&apos;t exist.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Back to Home</Button></Link>
      </div>
    );
  }

  if (room.status === "finished") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4 text-white">
        <div className="text-6xl">🏆</div>
        <p className="text-zinc-400 text-xl">This game has already finished.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Create a New Room</Button></Link>
      </div>
    );
  }

  // All current players in this room (for display)
  const currentPlayers = await db
    .select({ username: users.username, userId: players.userId })
    .from(players)
    .innerJoin(users, eq(players.userId, users.id))
    .where(eq(players.roomId, roomId));

  // Pre-fill username from session if available — user can still change it
  const session = await getSession();
  const prefillUsername = session?.username ?? "";
  const takenNames = currentPlayers.map(p => p.username.toLowerCase());

  // NOTE: We intentionally do NOT redirect "alreadyIn" users here.
  // Always show the form so they can change their name if needed.
  // Submitting the same name → reuses existing identity (fast).
  // Submitting a new name → creates new identity.

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 overflow-hidden">
      {/* Glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-red-600/15 blur-[130px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-[250px] w-[250px] rounded-full bg-yellow-400/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-7">

        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="border-red-500/40 bg-red-950/40 text-red-400">
            ♦ King of Diamonds
          </Badge>
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Join Room
          </h1>
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="text-center">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-0.5">Code</p>
              <p className="text-3xl font-black font-mono tracking-[0.2em] text-white">{room.roomCode}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-0.5">Status</p>
              <p className={`font-bold text-sm ${room.status === "active" ? "text-emerald-400" : "text-yellow-400"}`}>
                {room.status === "waiting" ? "⏳ Lobby" : "● Active"}
              </p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-0.5">Players</p>
              <p className="font-bold text-white text-lg">{currentPlayers.length}</p>
            </div>
          </div>
        </div>

        {/* Who's already in */}
        {currentPlayers.length > 0 && (
          <div className="w-full bg-zinc-900/60 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-3">Already in room</p>
            <div className="flex flex-wrap gap-2">
              {currentPlayers.map(p => (
                <span key={p.userId} className="text-xs bg-zinc-800 border border-white/10 rounded-full px-3 py-1 text-zinc-300">
                  {p.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            ⚠ {decodeURIComponent(error)}
          </div>
        )}

        {/* Join form — always shown, always editable */}
        <form action={joinByLinkAction} className="w-full bg-zinc-900/70 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
          <input type="hidden" name="roomId" value={roomId} />
          <div className="space-y-2">
            <Label htmlFor="join-username" className="text-zinc-300 font-medium">
              Your name
            </Label>
            {/*
              IMPORTANT: Use `key` tied to roomId so React recreates the input
              fresh when navigating between rooms, preventing stale defaultValue.
              Do NOT use defaultValue for pre-fill since React doesn't re-apply it
              on re-renders — use `key` + defaultValue together.
            */}
            <Input
              key={`join-input-${roomId}-${prefillUsername}`}
              id="join-username"
              name="username"
              placeholder="e.g. Alex, Player1…"
              defaultValue={prefillUsername}
              required
              autoComplete="off"
              className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 h-12 text-base focus-visible:ring-red-500"
            />
            {takenNames.length > 0 && (
              <p className="text-xs text-zinc-700">
                Taken: {takenNames.join(", ")}
              </p>
            )}
            {prefillUsername && (
              <p className="text-xs text-zinc-600">
                Clear the field to enter a different name.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-[0_0_20px_rgba(220,38,38,0.3)] h-12"
          >
            Join Game ♦
          </Button>
          <p className="text-xs text-zinc-600 text-center">
            Keep the pre-filled name to return as yourself, or enter a new one.
          </p>
        </form>

        <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Create your own room instead →
        </Link>
      </div>
    </main>
  );
}
