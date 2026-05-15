import Link from "next/link";
import { redirect } from "next/navigation";
import { getRoomState, startGame, resolveCurrentRound, kickPlayer } from "@/actions/game-actions";
import { getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Home } from "lucide-react";
import CopyRoomLink from "@/components/game/CopyRoomLink";
import RoomPoller from "@/components/game/RoomPoller";
import CountdownTimer from "@/components/game/CountdownTimer";
import GuessForm from "@/components/game/GuessForm";
import RoundBanner from "@/components/game/RoundBanner";
import ResultTimer from "@/components/game/ResultTimer";
import GameOverRedirect from "@/components/game/GameOverRedirect";
import AddBotsButton from "@/components/game/AddBotsButton";

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const session = await getSession();
  if (!session) redirect(`/join/${roomId}`);

  let state;
  try { state = await getRoomState(roomId); }
  catch {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black gap-4 text-white">
        <p className="text-red-500 text-2xl font-bold">Room not found.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Go Home</Button></Link>
      </div>
    );
  }

  const { room, players, currentRound, submittedPlayerIds, submittedValues, showingResults, currentResult } = state;
  const winner = players.find(p => p.isWinner);
  const me = players.find(p => p.userId === session.userId);
  const isHost = room.hostUserId === session.userId;
  const iHaveSubmitted = me ? submittedPlayerIds.includes(me.id) : false;

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-black text-white overflow-x-hidden">
      <RoomPoller intervalMs={2000} />
      {room.status === "active" && currentRound?.submissionDeadline && (
        <RoundBanner
          roundNumber={room.currentRound}
          submissionDeadline={currentRound.submissionDeadline.toISOString()}
          roundDurationSecs={room.roundDuration}
        />
      )}

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md z-50 sticky top-0 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Home className="w-4 h-4" /> Home
          </Link>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <span className="text-zinc-200">Room</span>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
          <span className="text-red-400 font-mono tracking-widest">{room.roomCode}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 hidden sm:block">Playing as</span>
          <span className="text-white font-bold">{session.username}</span>
          {isHost && <Badge variant="outline" className="border-yellow-500/40 bg-yellow-950/30 text-yellow-400 text-xs">HOST</Badge>}
          {me?.isEliminated && <Badge variant="outline" className="border-red-500/40 bg-red-950/30 text-red-400 text-xs">OUT</Badge>}
        </div>
      </nav>

      {/* ── Ambient glow ───────────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[150px]" />
        <div className="absolute top-0 right-0 h-[300px] w-[300px] rounded-full bg-yellow-500/5 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 py-10 px-4">

        {/* ══ LEFT PANEL ══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Title */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              King of Diamonds
            </h1>
            <div>
              {room.status === "active" && !showingResults && (
                <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 animate-pulse">
                  ● LIVE · Round {room.currentRound}
                </Badge>
              )}
              {room.status === "active" && showingResults && (
                <Badge className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30">
                  Round {room.currentRound} Results
                </Badge>
              )}
              {room.status === "waiting" && <Badge variant="outline" className="border-white/20 text-zinc-400">Lobby</Badge>}
              {room.status === "finished"  && <Badge variant="outline" className="border-yellow-500/40 text-yellow-400">Finished</Badge>}
            </div>
          </div>

          {/* ══ RESULTS PANEL (shown for 5s before next round starts) ═══════ */}
          {showingResults && currentResult && (
            <div className="rounded-xl border border-yellow-500/20 bg-zinc-900/80 backdrop-blur p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-base font-bold text-white">
                  ♦ Round {currentResult.roundNumber} Results
                </p>
                <div className="flex gap-4 text-xs">
                  <span className="text-zinc-500">Average: <strong className="text-white">{currentResult.averageGuess?.toFixed(2) ?? "—"}</strong></span>
                  <span className="text-zinc-500">Target: <strong className="text-red-400">{currentResult.targetNumber?.toFixed(2) ?? "—"}</strong></span>
                  <span className="text-zinc-700">(avg × 0.8)</span>
                </div>
              </div>

              {/* Per-player breakdown */}
              <div className="space-y-1.5">
                {[...currentResult.breakdown]
                  .sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0))
                  .map(row => (
                    <div key={row.playerId}
                      className={`flex items-center gap-2 sm:gap-4 rounded-lg px-3 py-2.5 text-sm border
                        ${row.isWinner ? "bg-yellow-950/40 border-yellow-500/30" : "bg-zinc-950/60 border-white/5"}`}>
                      <span className={`flex-1 font-semibold truncate ${row.isWinner ? "text-yellow-300" : "text-zinc-300"}`}>
                        {row.username}
                        {row.isExactMatch && <span className="ml-2 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">EXACT</span>}
                        {row.isWinner && !row.isExactMatch && <span className="ml-2 text-xs text-emerald-400">👑 Closest</span>}
                      </span>
                      <span className="font-mono text-sm font-bold text-zinc-300 min-w-[2rem] text-center">
                        {row.value < 0 ? <span className="text-zinc-600 text-xs">skipped</span> : row.value}
                      </span>
                      <span className="font-mono text-xs text-zinc-600 hidden sm:block min-w-[4rem] text-right">
                        Δ {row.value >= 0 && row.deviation != null ? row.deviation.toFixed(2) : "—"}
                      </span>
                      <span className={`font-black font-mono text-base min-w-[3.5rem] text-right ${(row.scoreDelta ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {(row.scoreDelta ?? 0) > 0 ? `+${row.scoreDelta}` : row.scoreDelta}
                      </span>
                    </div>
                  ))}
              </div>

              <p className="text-xs text-zinc-700">Exact = ±0 → +2/−2 · Closest = +1/−1 · Tied both win · Skip = −1 · 3 skips in a row = eliminated</p>

              {currentResult.resolvedAt && (
                <ResultTimer resolvedAt={currentResult.resolvedAt.toISOString()} roomId={roomId} resultDisplayMs={20000} />
              )}
            </div>
          )}

          {/* ══ MAIN CARD ════════════════════════════════════════════════════ */}
          <Card className="border border-white/10 bg-zinc-900/60 shadow-2xl backdrop-blur-xl">
            <CardHeader className="border-b border-white/5 pb-5">
              <CardTitle className="text-xl text-white">
                {room.status === "waiting"   && "⏳ Waiting for players…"}
                {room.status === "active" && showingResults && <>📊 Round {room.currentRound} complete</>}
                {room.status === "active" && !showingResults && <><span className="text-red-500 mr-1">♦</span>Round {room.currentRound} — Submit your guess</>}
                {room.status === "finished"  && "🏆 Game Over"}
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {room.status === "waiting"   && "Share the invite link. Host sets game rules."}
                {room.status === "active" && showingResults && "Results shown above — next round starts soon."}
                {room.status === "active" && !showingResults && `Guess 0–100. Target = 80% of avg. Elimination ≤ ${room.eliminationScore}. 3 skips = kicked.`}
                {room.status === "finished"  && "The last player standing wins!"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* ════ LOBBY ════════════════════════════════════════════════════ */}
              {room.status === "waiting" && (
                <>
                  <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-5 space-y-3">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Invite Code</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-4xl font-mono tracking-[0.25em] text-white font-black">{room.roomCode}</span>
                      <CopyRoomLink roomCode={room.roomCode} roomId={roomId} />
                    </div>
                  </div>

                  {isHost ? (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400">
                        You are the <span className="text-yellow-400 font-semibold">host</span>.
                        Needs ≥ 3 players — bots auto-fill if short.
                      </p>

                      <div className="rounded-xl bg-zinc-950/50 border border-white/5 p-4 space-y-3">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Game Settings</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="elimScore" className="text-xs text-zinc-400">Elimination Score</Label>
                            <select id="elimScore" name="elimScore" form="start-form"
                              className="w-full bg-zinc-900 border border-white/10 text-white rounded-md px-3 py-2 text-sm" defaultValue="-10">
                              <option value="-3">−3 (Fast)</option>
                              <option value="-5">−5 (Normal)</option>
                              <option value="-10">−10 (Standard)</option>
                              <option value="-15">−15 (Long)</option>
                              <option value="-20">−20 (Marathon)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="roundDur" className="text-xs text-zinc-400">Round Timer</Label>
                            <select id="roundDur" name="roundDuration" form="start-form"
                              className="w-full bg-zinc-900 border border-white/10 text-white rounded-md px-3 py-2 text-sm" defaultValue="30">
                              <option value="15">15s</option>
                              <option value="30">30s (Default)</option>
                              <option value="45">45s</option>
                              <option value="60">60s</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <form id="start-form" action={async (fd: FormData) => {
                        "use server";
                        const elimScore = parseInt(fd.get("elimScore") as string) || -10;
                        const roundDur  = parseInt(fd.get("roundDuration") as string) || 30;
                        const { db: dbClient } = await import("@/db");
                        const { gameRooms: gr }  = await import("@/db/schema");
                        const { eq: eqFn }       = await import("drizzle-orm");
                        await dbClient.update(gr).set({ eliminationScore: elimScore, roundDuration: roundDur }).where(eqFn(gr.id, roomId));
                        await startGame(roomId, room.hostUserId);
                      }}>
                        <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-base h-12 shadow-[0_0_20px_rgba(220,38,38,0.25)]">
                          ▶ Start Game
                        </Button>
                      </form>

                      <AddBotsButton roomId={roomId} />
                      <p className="text-xs text-zinc-700">AI bots pick random 0–100 (different each round)</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 text-sm text-blue-300">
                      Waiting for <strong>{players.find(p => p.userId === room.hostUserId)?.username ?? "host"}</strong> to start…
                    </div>
                  )}
                </>
              )}

              {/* ════ ACTIVE — SHOWING RESULTS ═════════════════════════════════ */}
              {room.status === "active" && showingResults && (
                <div className="text-center py-3">
                  <p className="text-zinc-600 text-xs">Results are shown above. Next round starts automatically.</p>
                </div>
              )}

              {/* ════ ACTIVE — SUBMITTING ══════════════════════════════════════ */}
              {room.status === "active" && !showingResults && currentRound && (
                <div className="space-y-6">
                  <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
                    {currentRound.submissionDeadline && (
                      <CountdownTimer deadline={currentRound.submissionDeadline.toISOString()} roomId={roomId} />
                    )}
                    <div className="flex-1 min-w-0">
                      {me && !me.isEliminated && !iHaveSubmitted && (
                        <GuessForm playerId={me.id} roundId={currentRound.id} roomId={roomId} />
                      )}
                      {iHaveSubmitted && !me?.isEliminated && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-center gap-4">
                          <span className="text-4xl">✅</span>
                          <div>
                            <p className="text-emerald-400 font-bold text-lg">Guess submitted!</p>
                            <p className="text-zinc-500 text-sm">Waiting for others… Resolves when everyone submits.</p>
                          </div>
                        </div>
                      )}
                      {me?.isEliminated && (
                        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 flex items-center gap-4">
                          <span className="text-4xl">💀</span>
                          <div>
                            <p className="text-red-400 font-bold text-lg">You&apos;ve been eliminated</p>
                            <p className="text-zinc-500 text-sm">Spectate the remaining players.</p>
                          </div>
                        </div>
                      )}
                      {!me && (
                        <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/20 p-5 text-sm text-zinc-500">
                          You are spectating.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission status chips */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">This round</p>
                    <div className="flex flex-wrap gap-2">
                      {players.filter(p => !p.isEliminated).map(p => {
                        const submitted = submittedPlayerIds.includes(p.id);
                        return (
                          <span key={p.id}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all
                              ${submitted ? "bg-emerald-950/40 border-emerald-600/30 text-emerald-400" : "bg-zinc-900 border-white/10 text-zinc-500"}`}>
                            {submitted ? "✓" : "…"} {p.username}{p.isAi ? " 🤖" : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {isHost && (
                    <>
                      <Separator className="bg-white/5" />
                      <form action={async () => { "use server"; await resolveCurrentRound(roomId); }}>
                        <Button type="submit" variant="ghost" className="w-full text-zinc-600 hover:text-white hover:bg-white/5 text-xs">
                          ⏭ Force Resolve (Host)
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {room.status === "finished" && winner && (
                <div className="flex flex-col items-center py-10 text-center">
                  <GameOverRedirect delayMs={8000} />
                  <div className="text-8xl mb-5 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] animate-bounce">👑</div>
                  <h2 className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r mb-2
                    ${winner.userId === session.userId ? "from-yellow-200 to-yellow-500" : "from-zinc-200 to-zinc-400"}`}>
                    {winner.userId === session.userId ? "You Win! 🎉" : `${winner.username} Wins!`}
                  </h2>
                  <p className="text-zinc-400 mt-2 max-w-sm">
                    {winner.userId === session.userId ? "Last one standing. Well played!" : `${winner.username} outlasted everyone.`}
                  </p>
                  <Link href="/" className="mt-6">
                    <Button variant="outline" className="border-white/20 hover:bg-white hover:text-black px-8">Go Home Now</Button>
                  </Link>
                </div>
              )}
              {room.status === "finished" && !winner && (
                <div className="flex flex-col items-center py-10 text-center text-zinc-500">
                  <GameOverRedirect delayMs={8000} />
                  <p className="text-2xl">🤝 Everyone eliminated — draw!</p>
                  <Link href="/" className="mt-6">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black">Go Home Now</Button>
                  </Link>
                </div>
              )}


            </CardContent>
          </Card>
        </div>

        {/* ══ SCOREBOARD ══════════════════════════════════════════════════════ */}
        <div>
          <Card className="border border-white/10 bg-zinc-900/60 backdrop-blur-xl sticky top-20">
            <CardHeader className="border-b border-white/5 py-4 px-5">
              <CardTitle className="text-base text-zinc-100 flex items-center justify-between">
                <span>Scoreboard</span>
                <span className="text-zinc-500 text-xs font-normal">
                  {players.filter(p => !p.isEliminated).length} alive / {players.length}
                </span>
              </CardTitle>
              <p className="text-xs text-zinc-700">Elim at ≤ {room.eliminationScore} · 3 consecutive skips = kicked</p>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-white/5 max-h-[65vh] overflow-y-auto">
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => {
                  const isMe = p.userId === session.userId;
                  const isHostPlayer = p.userId === room.hostUserId;
                  const hasSubmitted = submittedPlayerIds.includes(p.id);
                  const canKick = isHost && !isMe && !isHostPlayer && room.status === "waiting";
                  const guessVal = submittedValues[p.id];

                  return (
                    <li key={p.id}
                      className={`flex items-center gap-2 px-4 py-3 transition-all group
                        ${p.isEliminated ? "opacity-30 grayscale" : "hover:bg-white/[0.02]"}
                        ${isMe ? "bg-red-950/20 border-l-2 border-red-500" : ""}`}>
                      <span className="text-xs text-zinc-700 w-4 font-mono text-center flex-shrink-0">{i + 1}</span>
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                        ${p.isEliminated ? "bg-red-700" : "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`font-medium text-sm truncate ${isMe ? "text-red-300" : "text-white"}`}>{p.username}</span>
                          {isMe && <span className="text-xs text-red-400/60">(you)</span>}
                          {isHostPlayer && <span className="text-xs text-yellow-500/60">👑</span>}
                          {p.isAi && <span className="text-xs text-zinc-700">🤖</span>}
                        </div>
                        {/* Show guess after round resolves */}
                        {guessVal !== undefined && (
                          <span className="text-xs font-mono text-zinc-600">
                            {guessVal < 0 ? "skipped" : `→ ${guessVal}`}
                          </span>
                        )}
                        {/* During active submitting phase */}
                        {!showingResults && room.status === "active" && !p.isEliminated && guessVal === undefined && (
                          <span className={`text-xs ${hasSubmitted ? "text-emerald-700" : "text-zinc-800"}`}>
                            {hasSubmitted ? "✓" : "…"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p.isWinner && <span className="text-yellow-400">🏆</span>}
                        {p.isEliminated && <span className="text-xs text-red-700 font-bold">OUT</span>}
                        <span className={`text-sm font-bold font-mono min-w-[2.5rem] text-right
                          ${p.score < 0 ? "text-red-400" : p.score > 0 ? "text-emerald-400" : "text-zinc-400"}`}>
                          {p.score > 0 ? `+${p.score}` : p.score}
                        </span>
                        {canKick && (
                          <form action={kickPlayer}>
                            <input type="hidden" name="targetPlayerId" value={p.id} />
                            <input type="hidden" name="hostUserId" value={session.userId} />
                            <input type="hidden" name="roomId" value={roomId} />
                            <button type="submit" title={`Kick ${p.username}`}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-700 hover:text-red-400 hover:bg-red-950/40 rounded p-1 text-xs ml-1">
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}
