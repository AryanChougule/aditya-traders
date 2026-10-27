import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };

/*
 * Production: Neon Postgres over WebSockets (supports transactions), selected by DATABASE_URL.
 * Development without DATABASE_URL: an embedded Postgres (PGlite) in .data/, migrated and seeded on first use.
 * Both speak the same SQL, so every query and migration runs unchanged in either place.
 */
async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const [{ Pool, neonConfig }, { drizzle }, ws] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-serverless"),
      import("ws"),
    ]);
    neonConfig.webSocketConstructor = ws.default;
    return drizzle({ client: new Pool({ connectionString: url }), schema }) as unknown as DB;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_LOCAL_DB) {
    throw new Error("DATABASE_URL is not set. Add your Neon connection string in the Vercel project settings.");
  }
  const [{ PGlite }, { drizzle }, { migrate }, { seed }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
    import("./seed"),
  ]);
  // "memory://" gives each process its own throwaway copy (local production builds run many workers at once)
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  if (!dir.startsWith("memory://")) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await seed(db as unknown as DB);
  return db as unknown as DB;
}

const g = globalThis as unknown as { __atDb?: Promise<DB> };

/** Shared connection; kept on globalThis so dev hot reloads don't open a new database each time. */
export function getDb(): Promise<DB> {
  g.__atDb ??= connect().catch((e) => {
    g.__atDb = undefined;
    throw e;
  });
  return g.__atDb;
}
