import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { devLoginAllowed, endSession, normalizePhone, startSession, upsertUser, verifyFirebaseIdToken } from "@/server/auth";
import { allow } from "@/server/rate-limit";

const body = z.union([
  z.object({ idToken: z.string().min(20), name: z.string().max(60).optional() }),
  z.object({ devPhone: z.string(), devCode: z.string(), name: z.string().max(60).optional() }),
]);

const TEST_CODE = "1234";

/** Exchanges a verified phone sign-in for a session cookie. */
export async function POST(req: Request) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allow(`login:${ip}`, 20, 600))) {
    return NextResponse.json({ error: "Too many attempts. Please wait 10 minutes and try again." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Something was missing. Please try again." }, { status: 400 });

  let phone: string | null;
  if ("idToken" in parsed.data) {
    try {
      phone = await verifyFirebaseIdToken(parsed.data.idToken);
    } catch {
      return NextResponse.json({ error: "We couldn't verify that code. Please request a new one." }, { status: 401 });
    }
  } else {
    if (!devLoginAllowed()) return NextResponse.json({ error: "Test login is turned off." }, { status: 403 });
    phone = normalizePhone(parsed.data.devPhone);
    if (!phone || parsed.data.devCode !== TEST_CODE) {
      return NextResponse.json({ error: "That code isn't right. Check it and try again." }, { status: 401 });
    }
  }

  const user = await upsertUser(phone, parsed.data.name);
  if (user.disabled) return NextResponse.json({ error: "This account is disabled. Please call the store." }, { status: 403 });
  await startSession(user.id);
  return NextResponse.json({ ok: true, needsName: !user.name });
}

export async function DELETE() {
  await endSession();
  return NextResponse.json({ ok: true });
}
