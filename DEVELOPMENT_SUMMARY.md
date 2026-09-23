# King of Diamonds - Development Summary

This document outlines the architecture, features, and major bug fixes implemented in the "King of Diamonds" (Beauty Contest) multiplayer game engine.

## 🎮 Game Overview
A real-time multiplayer game based on Alice in Borderland. Players pick a number between 0 and 100. The target number is **80% of the average** of all guesses.
- **Closest Guess**: winner ±0, everyone else −1
- **Exact Match (Rule 2)**: everyone except the winner loses −2
- **No answer**: counted as a guess of 0 — there is no skip mechanic
- **Elimination**: a player is out when their score reaches the host-defined threshold (default −10)

The single source of truth for the scoring rules is `src/lib/game-engine.ts`, which is a pure
function with no database or clock access. `src/lib/game-engine.test.ts` pins every rule; run it
with `npm test`.

## 🏗️ Core Architecture
- **Framework**: Next.js (App Router)
- **Database**: Neon Postgres via Drizzle ORM
- **State Management**: Server Actions + Database as the source of truth
- **Real-time Sync**: Client-side `RoomPoller` (1500ms intervals) using the Page Visibility API to pause when tabs are hidden and immediately sync upon return, eliminating lag without the overhead of WebSockets.

## 🔐 Identity & Session Management
- **Stateless Sessions**: Custom lightweight `httpOnly` cookie system storing `userId` and `username`.
- **Identity Protection**: Resolved identity hijacking vulnerabilities. The join action performs `INSERT` operations with a suffix retry-loop for global username uniqueness, ensuring users cannot steal another host/player's session by simply typing their name.
- **Join Flow**: Seamless joining where users with existing sessions can effortlessly re-enter rooms, while still maintaining the freedom to change their username via a pre-filled, editable form.

## 🔄 Game Loop & Timing Engine
The game loop was completely decoupled from strict server-side chron-jobs into an event-driven, client-synchronized flow:
1. **Submit Phase**: Handled by a stateless `CountdownTimer` that computes time directly from the `submissionDeadline` timestamp. This makes it completely immune to `router.refresh()` React remounts.
2. **Resolution Phase**: Server calculates averages, deviations, and score deltas in a single transaction.
3. **Results Phase**: `ResultTimer` displays the outcome for 20 seconds. Any player can press the **Skip ⏭** button to immediately advance.
4. **Transition Phase**: A pure time-based `RoundBanner` displays for exactly 2 seconds, immune to infinite-loop remount bugs.

## 🤖 AI Integration
- Replaced slow, blocking LLM calls with instantaneous uniform random generation (`0-100`).
- Bots are generated and their guesses are bulk-inserted immediately when a round starts, causing zero latency to the human players.

## 🔒 Trusting the Session, Not the Form
Every server action in `src/actions/` derives **who is acting** from the httpOnly session cookie
and looks the caller's `players` row up by `(userId, roomId)`. Server Actions are reachable by a
direct POST once their id is known, so a `playerId` or `hostUserId` arriving in a hidden input is
attacker-controlled input. Submitting a guess, starting the game, changing the game settings and
kicking a player are all authorised server-side; a hand-crafted request cannot submit on a rival's
behalf, start someone else's game, or set an out-of-range elimination threshold.

## ⚔️ Concurrency Without Transactions
The Neon HTTP driver issues each statement as its own request — there are no transactions. State
changes are therefore guarded by **conditional updates that double as locks**:

- `resolveRound` claims a round with `UPDATE rounds SET status='calculating' WHERE id=? AND
  status='submitting' RETURNING *`. Postgres locks the row, so exactly one caller gets a result
  even when the countdown expiry and the last submission land at the same instant. A read-then-write
  check would let both through and apply every score delta twice.
- `startGame` claims the `waiting → active` transition the same way, and rolls the room back to
  `waiting` if round 1 fails to materialise.
- `advanceRound` recounts eliminations with `SELECT count(*) ... WHERE is_eliminated` instead of
  incrementing a stored counter, so a second, slower caller can't reset the total (and with it the
  unlocked rules) back to zero.

## 🐛 Major Bugs Resolved
1. **Database Race Conditions**: Fixed server crashes when multiple clients triggered `advanceRound` simultaneously. Implemented an *Insert-First* pattern using `onConflictDoNothing` relying on composite unique indexes (`roomId`, `roundNumber`).
2. **Room Code Collisions**: Upgraded the `nanoid(6)` room creation from a single blind insert to a 10-attempt retry loop (`createUniqueRoom`), preventing crashes as the database scales.
3. **Infinite Timer Loops**: Moved `RoundBanner` and `CountdownTimer` away from `useState`/`setTimeout` delays (which broke during React reconciliations) to direct `Date.now()` timestamp math.
4. **Host Sync Freezes**: Fixed bugs where the host UI would freeze if a round advancement failed, ensuring the client state always faithfully represents the database state.

## 🚀 Next Steps / Future Scaling
- **WebSockets**: If concurrent player counts per room exceed 50-100, transition from `RoomPoller` to Supabase Realtime or Pusher to reduce database read load.
- **Cron Cleanup**: Implement a TTL job to prune old inactive rooms and guest users after 24 hours to keep the Neon database lightweight.
