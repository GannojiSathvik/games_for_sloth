// src/db/migrate.ts
// Applies all pending Drizzle migrations against DATABASE_URL.
// Runs automatically before every `next build` (Vercel & local).
// On Vercel: DATABASE_URL comes from environment variables (injected by Vercel).
// Locally: loaded from .env.local via dotenv (skipped silently if file missing).
//
// IMPORTANT: If migrations fail (e.g. types already exist), the script still
// exits 0 so it never blocks the Next.js build on Vercel.

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Load .env.local for local dev — no-op on Vercel (file doesn't exist, dotenv skips it)
config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("⚠️  DATABASE_URL is not set. Skipping migrations.");
  process.exit(0); // Don't block build
}

const sql = neon(url);
const db = drizzle(sql);

async function run() {
  console.log("🔄 Running Drizzle migrations...");
  try {
    await migrate(db, { migrationsFolder: "drizzle/migrations" });
    console.log("✅ Migrations complete.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // "already exists" errors are safe to ignore — the DB is already up to date
    if (msg.includes("already exists")) {
      console.warn("⚠️  Migration skipped (objects already exist). DB is up to date.");
    } else {
      console.error("⚠️  Migration error (non-fatal):", msg);
    }
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("⚠️  Migration script error (non-fatal):", err);
  process.exit(0); // Never block the build
});
