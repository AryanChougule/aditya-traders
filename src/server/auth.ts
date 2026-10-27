import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "./db";

export type Role = "customer" | "owner" | "packer" | "rider";
export type SessionUser = { id: string; phone: string; name: string; role: Role; subPref: "similar" | "ask" | "remove" };

const COOKIE = "at_session";
const SESSION_DAYS = 60;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** "+919876543210" from anything a shopper might type or Firebase returns. Null if it isn't an Indian mobile. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export const displayPhone = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;

/* ---------- Firebase ID token verification (no service account needed) ---------- */

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export function firebaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
}

/** Verifies a Firebase phone-auth ID token and returns the verified phone number. */
export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase is not configured");
  const { payload } = await jwtVerify(idToken, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ["RS256"],
  });
  const phone = typeof payload.phone_number === "string" ? normalizePhone(payload.phone_number) : null;
  if (!phone) throw new Error("This sign-in has no Indian mobile number attached");
  return phone;
}

/** Test login (code 1234) exists only on a developer's machine, never in a production build. */
export function devLoginAllowed() {
  return process.env.NODE_ENV !== "production" && !firebaseConfigured();
}

/* ---------- users and sessions ---------- */

function ownerPhones(): Set<string> {
  return new Set(
    (process.env.OWNER_PHONES ?? "")
      .split(",")
      .map((p) => normalizePhone(p))
      .filter((p): p is string => Boolean(p)),
  );
}

/** Finds or creates the user for a verified phone, promoting configured owner numbers. */
export async function upsertUser(phone: string, name?: string) {
  const db = await getDb();
  const clean = name?.trim().slice(0, 60);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.phone, phone));
  const isOwner = ownerPhones().has(phone);
  if (existing) {
    const patch: Partial<typeof schema.users.$inferInsert> = {};
    if (clean && !existing.name) patch.name = clean;
    if (isOwner && existing.role !== "owner") patch.role = "owner";
    if (Object.keys(patch).length) await db.update(schema.users).set(patch).where(eq(schema.users.id, existing.id));
    return { ...existing, ...patch };
  }
  const [created] = await db
    .insert(schema.users)
    .values({ phone, name: clean ?? "", role: isOwner ? "owner" : "customer" })
    .returning();
  return created;
}

export async function startSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.sessions).values({ id: hash(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hash(token)));
  }
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  // session expiry compares against the current time, so this is always request-time work
  await connection();
  const db = await getDb();
  const [row] = await db
    .select({
      id: schema.users.id,
      phone: schema.users.phone,
      name: schema.users.name,
      role: schema.users.role,
      subPref: schema.users.subPref,
      disabled: schema.users.disabled,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, hash(token)), gt(schema.sessions.expiresAt, new Date())));
  if (!row || row.disabled) return null;
  return { id: row.id, phone: displayPhone(row.phone), name: row.name, role: row.role, subPref: row.subPref };
});

export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export const STAFF_ROLES: Role[] = ["owner", "packer", "rider"];

/** For pages: signed-in staff with one of the roles, otherwise off to login or the shop. */
export async function requireStaff(next: string, roles: Role[] = STAFF_ROLES): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect("/?denied=1");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function assertRole(roles: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Please log in again.");
  if (!roles.includes(user.role)) throw new ActionError("You don't have permission to do that.");
  return user;
}

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {}
