// src/db/schema.ts
// King of Diamonds — "Beauty Contest" — Drizzle ORM Schema
// Compatible with Neon Postgres via @neondatabase/serverless

import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  real,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const gameStatusEnum = pgEnum("game_status", [
  "waiting",   // lobby — waiting for players
  "active",    // game is running
  "finished",  // game is over
]);

export const roundStatusEnum = pgEnum("round_status", [
  "submitting", // players can still submit guesses
  "calculating",// timer expired, server is calculating
  "completed",  // results are published
]);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  isAi: boolean("is_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  players: many(players),
}));

// ─────────────────────────────────────────────────────────────────────────────
// GAME ROOMS
// ─────────────────────────────────────────────────────────────────────────────

export const gameRooms = pgTable("game_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Short 6-char code players type to join, e.g. "AK47X2" */
  roomCode: varchar("room_code", { length: 8 }).notNull().unique(),
  hostUserId: uuid("host_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: gameStatusEnum("status").notNull().default("waiting"),
  maxPlayers: integer("max_players").notNull().default(8),
  /** Elimination threshold — default -10 */
  eliminationScore: integer("elimination_score").notNull().default(-10),
  /** Round duration in seconds */
  roundDuration: integer("round_duration").notNull().default(60),
  currentRound: integer("current_round").notNull().default(0),
  /** Total players eliminated across the whole game — drives progressive rule unlocks */
  eliminationCount: integer("elimination_count").notNull().default(0),
  /** Progressive rules active this game, e.g. ["duplicate_guard","exact_penalty"] */
  activeRules: jsonb("active_rules").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameRoomsRelations = relations(gameRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [gameRooms.hostUserId],
    references: [users.id],
  }),
  players: many(players),
  rounds: many(rounds),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PLAYERS  (junction table: users ↔ game_rooms + per-game score tracking)
// ─────────────────────────────────────────────────────────────────────────────

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRooms.id, { onDelete: "cascade" }),
    /** Running score within this game room */
    score: integer("score").notNull().default(0),
    /** True once score falls to eliminationScore */
    isEliminated: boolean("is_eliminated").notNull().default(false),
    /** True for the player who wins the whole game */
    isWinner: boolean("is_winner").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("players_user_room_idx").on(table.userId, table.roomId),
    index("players_room_idx").on(table.roomId),
  ]
);

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
  room: one(gameRooms, {
    fields: [players.roomId],
    references: [gameRooms.id],
  }),
  guesses: many(guesses),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ROUNDS
// ─────────────────────────────────────────────────────────────────────────────

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRooms.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    status: roundStatusEnum("status").notNull().default("submitting"),
    /** Stored after calculation: avg * 0.8 */
    targetNumber: real("target_number"),
    /** Raw average of all submitted guesses */
    averageGuess: real("average_guess"),
    /** Unix-ms when the submission window expires */
    submissionDeadline: timestamp("submission_deadline", { withTimezone: true }),
    /** Which progressive rules fired this round, e.g. ["duplicate_guard"] */
    triggeredRules: jsonb("triggered_rules").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("rounds_room_number_idx").on(table.roomId, table.roundNumber),
  ]
);

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  room: one(gameRooms, {
    fields: [rounds.roomId],
    references: [gameRooms.id],
  }),
  guesses: many(guesses),
}));

// ─────────────────────────────────────────────────────────────────────────────
// GUESSES  (one row per player per round)
// ─────────────────────────────────────────────────────────────────────────────

export const guesses = pgTable(
  "guesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    /** The number submitted by this player (0–100) */
    value: real("value").notNull(),
    /** Diff from target, populated after round resolves */
    deviation: real("deviation"),
    /** Score delta applied to this player this round (+2/−2/+1/−1) */
    scoreDelta: integer("score_delta"),
    /** True if this player was a winner this round */
    isRoundWinner: boolean("is_round_winner").notNull().default(false),
    /** True if this player hit the exact target */
    isExactMatch: boolean("is_exact_match").notNull().default(false),
    /** True if Rule 1 (duplicate_guard) applied an extra -1 to this player */
    isDuplicatePenalty: boolean("is_duplicate_penalty").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("guesses_round_player_idx").on(table.roundId, table.playerId),
    index("guesses_round_idx").on(table.roundId),
  ]
);

export const guessesRelations = relations(guesses, ({ one }) => ({
  round: one(rounds, {
    fields: [guesses.roundId],
    references: [rounds.id],
  }),
  player: one(players, {
    fields: [guesses.playerId],
    references: [players.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES  (handy for server actions & components)
// ─────────────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type GameRoom = typeof gameRooms.$inferSelect;
export type NewGameRoom = typeof gameRooms.$inferInsert;

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Round = typeof rounds.$inferSelect;
export type NewRound = typeof rounds.$inferInsert;

export type Guess = typeof guesses.$inferSelect;
export type NewGuess = typeof guesses.$inferInsert;
