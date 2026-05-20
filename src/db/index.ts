// src/db/index.ts
// Lazy-initialized Drizzle client for Neon Postgres (serverless-compatible).
// The connection is created on first use, NOT at module load time.
// This prevents "No database connection string" errors during `next build`
// on Vercel where DATABASE_URL is only available at runtime.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

export const db: NeonHttpDatabase<typeof schema> = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          "DATABASE_URL is not set. Make sure it is configured in your Vercel project settings."
        );
      }
      const sql = neon(url);
      _db = drizzle(sql, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});

export type DB = typeof _db;
