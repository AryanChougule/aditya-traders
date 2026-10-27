import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";

/**
 * Fixed-window counter in Postgres. Returns false once `limit` hits arrive within `windowSec`.
 * Enough for login attempts at this scale without running Redis.
 */
export async function allow(key: string, limit: number, windowSec: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`case when ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then 1 else ${schema.rateLimits.count} + 1 end`,
        windowStart: sql`case when ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then now() else ${schema.rateLimits.windowStart} end`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return row.count <= limit;
}
