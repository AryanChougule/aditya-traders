# Aditya Traders

Online ordering for a neighbourhood grocery store. It has three parts: a shopper web app (PWA), a store console for packing,
stock and settings, and a rider view. Built from the system design doc.

**To launch on your domain, follow [docs/GO-LIVE.md](docs/GO-LIVE.md).**

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No accounts needed locally. Without `DATABASE_URL`, an embedded Postgres in `.data/` is created, migrated and filled with
the starter catalog. Without Firebase, login accepts the test code **1234**; this only works on a developer machine and
never in a production build. Put `OWNER_PHONES=+91XXXXXXXXXX` in `.env.local` to make yourself the owner (see
`.env.example`).

```bash
npm test           # pricing, GST, weighing, substitutions, order state machine, IST slots, search
npm run typecheck
npm run lint
```

## How it fits together

| Layer | What | Where |
|---|---|---|
| Pages | Next.js 16 App Router, Cache Components, server-rendered | `src/app` |
| Business rules | Pure, unit-tested: pricing, settlement, GST, slots in IST, state machine, substitutions | `src/lib` |
| Server | Auth, orders (every change in a locked transaction), catalog, Razorpay | `src/server` |
| Mutations | Server actions with role checks and input validation | `src/app/actions.ts` |
| Database | Postgres via Drizzle; Neon in production, PGlite locally | `src/server/db`, `drizzle/` |
| Login | Firebase phone OTP → server verifies the ID token → HttpOnly session cookie | `src/server/auth.ts` |
| Payments | Cash/UPI on delivery; Razorpay ready behind a switch, with a signed webhook | `src/server/razorpay.ts` |

The browser stores only the cart and recent searches. Everything else is in the database and re-checked on the server.

## Changing the database

Edit `src/server/db/schema.ts`, then run `npm run db:generate` and commit the new file in `drizzle/`. Vercel applies it
on the next deploy (`vercel-build` runs `db:migrate` before building).
