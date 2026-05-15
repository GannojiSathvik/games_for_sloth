// src/db/index.ts
// Singleton Drizzle client for Neon Postgres (serverless-compatible)

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export type DB = typeof db;
