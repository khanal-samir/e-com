# SS Tech — Laptop E-commerce for Nepal

A minimal, production-shaped e-commerce store for laptops, built for a college project.

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack)
- **Drizzle ORM + PostgreSQL (Neon)**
- **Better Auth** — email/password + Google, `admin`/`user` roles (admin plugin)
- **eSewa ePay v2 (UAT)** — signed requests, server-side verification, status re-check
- **ImageKit** — direct browser uploads with short-lived server signatures
- **Tailwind CSS v4 + shadcn-style UI** (blue/slate, minimal)
- **Vitest** — unit, component, integration (Neon test DB) and smoke projects

---

## Quick start (local)

```bash
bun install                        # or npm install
cp .env.example .env.local         # fill in values (see below)
bunx drizzle-kit generate          # only when schema changes
DATABASE_URL=<test-neon-url> bunx drizzle-kit migrate
bun run db:seed                    # brands + 14 laptops + admin
bun run dev                        # http://localhost:3000
```

### Environment (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Dev/preview Neon **testing** project |
| `TEST_DATABASE_URL` | Integration-test target (must differ from production URL) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional; hides Google button when unset |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` / `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` / `IMAGEKIT_PRIVATE_KEY` | ImageKit |
| `ESEWA_PRODUCT_CODE` / `ESEWA_SECRET_KEY` / `ESEWA_PAYMENT_URL` / `ESEWA_STATUS_URL` | eSewa UAT (defaults to official test values) |
| `KHALTI_BASE_URL` / `KHALTI_SECRET_KEY` | Khalti sandbox (`https://dev.khalti.com`) — get the key at test-admin.khalti.com (login OTP `987654`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin |

**Seeded admin:** set by `bun run db:seed` from the admin env vars (local default:
`admin@sstech.com.np` / `Admin@12345` — change before any real deployment).

---

## Commands

```bash
bun run lint          # ESLint
bun run typecheck     # tsc --noEmit
bun run test          # vitest (watch)
bun run test:run      # vitest (all projects, no watch)
bun run test:unit     # unit only (no DB needed)
bun run test:components
bun run test:integration   # requires env below
bun run test:smoke         # requires SMOKE_BASE_URL
bun run verify        # lint + typecheck + test:run + build
```

### Integration tests (hit the Neon TESTING database)

```bash
TEST_FIXTURES=1 \
TEST_DATABASE_URL="postgresql://…testing-neon…" \
bun run test:integration
```

Safety guards refuse to run unless `TEST_FIXTURES=1` is set, `TEST_DATABASE_URL`
exists, and it differs from the operator-supplied `DATABASE_URL`. Fixtures are
namespaced (`vt_<runid>`), cleaned in `afterAll`, and never truncate tables.

### Smoke tests (against a live deployment)

```bash
SMOKE_BASE_URL=https://your-deployment.vercel.app bun run test:smoke
```

Covers: `/api/health`, home, catalogue, product detail, search, sign-in page,
and that `/admin` + `/checkout` redirect anonymous users.

---

## Payments — Cash on Delivery, eSewa (UAT) and Khalti (sandbox)

Checkout offers three methods:

- **Cash on Delivery** — order confirmed straight to `processing`, no gateway, pay the courier
- **eSewa (UAT)** — signed form → `rc-epay.esewa.com.np` → server-side verification + status check
- **Khalti (sandbox)** — server-side `initiate` → `test-pay.khalti.com` → server-side `lookup` verification

Test credentials:

```text
eSewa ID: 9806800001 / 9806800002 / 9806800003   Password: Nepal@123   OTP: 123456
Khalti ID: 9800000000 – 9800000005               MPIN: 1111            OTP: 987654
```

**Test mode:** with `PAYMENT_TEST_MODE=1` the gateway is charged a constant **Rs. 10** instead of the order total (sandbox wallets hold only a few rupees), while the order keeps its real total in the database and admin views. Turn it off for production.

Both gateways are strict: any non-success verification **cancels the order and releases reserved stock immediately** — no lingering "pending payment" states. Merchant secret keys (`ESEWA_SECRET_KEY`, `KHALTI_SECRET_KEY`) stay server-side.

### eSewa test flow

1. Add laptops to cart → checkout (sign-in required).
2. Server validates stock, recalculates prices, reserves stock (30 min), creates
   order + `initiated` payment, returns a signed form.
3. Browser posts to `rc-epay.esewa.com.np` (UAT).
4. Success callback verifies: base64 decode → HMAC signature → product code →
   eSewa **status endpoint** (`COMPLETE` required) → idempotent DB update.
5. Failure/expiry callbacks release reserved stock exactly once.

Public UAT credentials (shown in the checkout test panel):

```text
eSewa ID: 9711111111 / 9711111112 / 9711111113
Password: Test@123      Token: 123456
```

The merchant secret key stays server-side and is never rendered in the browser.

---

## Admin panel

`/admin` (role `admin` only, checked server-side on every page and action):

- **Dashboard** — active products, low stock, orders, eSewa revenue
- **Products** — create/edit/archive/delete, multi-image ImageKit upload,
  reorder, primary image, full spec fields
- **Orders** — status flow `paid → processing → shipped → delivered`, cancel
  releases stock
- **Payments** — full eSewa history + “Recheck with eSewa” for pending/ambiguous
  transactions

---

## Deployment (Vercel CLI + Neon)

Two Neon projects: **production** and **testing**. Production `DATABASE_URL`
lives only in Vercel Production env; Preview/dev/tests use the testing project.

```bash
vercel link
vercel env pull .env.local --environment=development   # local env from Vercel

# preview
bun run verify
vercel deploy
SMOKE_BASE_URL=<preview-url> bun run test:smoke

# production (explicit steps)
bun run verify
DATABASE_URL=<prod-url> bunx drizzle-kit migrate
vercel deploy
SMOKE_BASE_URL=<deployment-url> bun run test:smoke
vercel promote <deployment-url>      # after smoke passes
vercel rollback                      # emergency
```

Migrations are applied **explicitly** via CLI — never inside the build.

## GitHub

```bash
gh repo create ss-tech --private --source=. --remote=origin --push
```

`.env*` and `.vercel/` are git-ignored; `.env.example` documents every variable.

---

## Project structure

```text
src/
├── actions/        # server actions (products, checkout, orders, payments, imagekit)
├── app/
│   ├── (store)/    # home, products, cart, checkout, payment, account
│   ├── (auth)/     # sign-in / sign-up
│   ├── admin/      # dashboard, products, orders, payments
│   └── api/        # better-auth handler, esewa callbacks, /api/health
├── components/     # ui primitives (shadcn-style) + feature components
├── db/             # drizzle schema, client, seed
└── lib/            # auth, session, esewa, payments, checkout, orders, queries…
tests/
├── unit/           # esewa signatures, money, validation
├── components/     # product card / badges
├── integration/    # checkout, inventory, callbacks, authorization, recheck
├── smoke/          # live deployment checks
└── fixtures/       # namespaced, self-cleaning test data
```
