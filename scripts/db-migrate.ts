/*
 * Applies pending migrations to the database in DATABASE_URL, then seeds it if empty.
 * Runs on every Vercel deploy (see "vercel-build" in package.json) and can be run by hand:
 *   DATABASE_URL=postgres://... npm run db:migrate
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";
import type { DB } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { seed } from "../src/server/db/seed";

async function main() {
  // migrations go over the direct connection: DDL and session state don't belong behind the pooler
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    // names only, never values: enough to tell a missing variable from one saved under another environment or name
    const seen = Object.keys(process.env).filter((k) => /DATABASE|POSTGRES|^PG|NEON/.test(k));
    throw new Error(
      `DATABASE_URL is not set for this build (VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}). ` +
        `Database-like variables present: ${seen.join(", ") || "none"}. ` +
        "In Vercel → Settings → Environment Variables, make sure DATABASE_URL is ticked for this environment, then redeploy.",
    );
  }
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await seed(db as unknown as DB);
  await pool.end();
  console.log("Database is up to date.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
