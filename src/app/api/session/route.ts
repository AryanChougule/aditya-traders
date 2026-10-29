import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { devLoginAllowed, endSession, normalizePhone, startSession, upsertGoogleUser, upsertUser, verifyFirebaseIdToken } from "@/server/auth";
import { allow } from "@/server/rate-limit";

const body = z.union([
  z.object({ idToken: z.string().min(20), name: z.string().max(60).optional() }),
  z.object({ devPhone: z.string(), devCode: z.string(), name: z.string().max(60).optional() }),
]);

const TEST_CODE = "1234";

/** Exchanges a verified Google sign-in (or, on a developer's machine, the test code) for a session cookie. */
export async function POST(req: Request) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allow(`login:${ip}`, 20, 600))) {
    return NextResponse.json({ error: "Too many attempts. Please wait 10 minutes and try again." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Something was missing. Please try again." }, { status: 400 });

  let user: Awaited<ReturnType<typeof upsertUser>>;
  if ("idToken" in parsed.data) {
    let identity;
    try {
      identity = await verifyFirebaseIdToken(parsed.data.idToken);
    } catch {
      return NextResponse.json({ error: "We couldn't verify your Google sign-in. Please try again." }, { status: 401 });
    }
    user = await upsertGoogleUser(identity);
  } else {
    if (!devLoginAllowed()) return NextResponse.json({ error: "Test login is turned off." }, { status: 403 });
    const phone = normalizePhone(parsed.data.devPhone);
    if (!phone || parsed.data.devCode !== TEST_CODE) {
      return NextResponse.json({ error: "That code isn't right. Check it and try again." }, { status: 401 });
    }
    user = await upsertUser(phone, parsed.data.name);
  }

  if (user.disabled) return NextResponse.json({ error: "This account is disabled. Please call the store." }, { status: 403 });
  await startSession(user.id);
  return NextResponse.json({ ok: true, needsName: !user.name });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
