// src/lib/username.ts
// One place that decides what a legal username is, and one way to mint a user row.
//
// Both join paths (home-page form and invite link) used to carry their own copy
// of createFreshUser. They also trusted whatever string arrived in the form,
// which the database does not: `users.username` is varchar(32), so a longer
// name came back as a raw Postgres error instead of something the player could
// act on. Worse, the uniqueness fallback appends "_" + 3 characters, so a name
// of exactly 32 characters produced a 36-character candidate that could never
// insert — the retry loop burned all five attempts and then threw.

import { db } from "@/db";
import { users } from "@/db/schema";
import { nanoid } from "nanoid";

/** Longest name we accept, leaving room for the "_abc" uniqueness suffix. */
export const MAX_USERNAME_LENGTH = 24;
const SUFFIX_LENGTH = 4; // "_" + nanoid(3)

/**
 * Normalise and validate a username straight off a form.
 * Throws with a message meant for the player, never a database error.
 */
export function normaliseUsername(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("Username is required.");

  // Collapse runs of whitespace so " a   b " and "a b" are the same name, and
  // strip control characters that would render as invisible glyphs in the UI.
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();

  if (!name) throw new Error("Username is required.");
  if (name.length > MAX_USERNAME_LENGTH)
    throw new Error(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);

  return name;
}

/**
 * Insert a brand-new user row — never look one up by name.
 *
 * Looking a user up by name is how identity hijacking gets in: typing someone
 * else's name would hand you their row. So the exact name is attempted once,
 * and a short random suffix is added if it is already taken globally.
 */
export async function createFreshUser(desiredUsername: string) {
  const name = normaliseUsername(desiredUsername);

  const exact = await db
    .insert(users)
    .values({ username: name, isAi: false })
    .onConflictDoNothing()
    .returning();
  if (exact.length > 0) return exact[0];

  // Leave room for the suffix so the candidate still fits varchar(32).
  const stem = name.slice(0, MAX_USERNAME_LENGTH - SUFFIX_LENGTH);
  for (let i = 0; i < 5; i++) {
    const candidate = `${stem}_${nanoid(3)}`;
    const result = await db
      .insert(users)
      .values({ username: candidate, isAi: false })
      .onConflictDoNothing()
      .returning();
    if (result.length > 0) return result[0];
  }

  throw new Error(`Could not create user "${name}" — please try a different name.`);
}
