// src/db/migrate.ts
// Applies all pending Drizzle migrations against DATABASE_URL.
// Runs automatically before every `next build` (Vercel & local).
// On Vercel: DATABASE_URL comes from environment variables (injected by Vercel).
// Locally: loaded from .env.local via dotenv (skipped silently if file missing).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Load .env.local for local dev — no-op on Vercel (file doesn't exist, dotenv skips it)
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set. Cannot run migrations.");
  process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql);

async function run() {
  console.log("🔄 Running Drizzle migrations...");
  await migrate(db, { migrationsFolder: "drizzle/migrations" });
  console.log("✅ Migrations complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
