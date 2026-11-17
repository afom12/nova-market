# NOVA MARKET

Full-stack e-commerce application with a complete Stripe Checkout integration:
server-authoritative pricing, signature-verified webhooks, and idempotent
payment processing enforced by database constraints.

React 18 + Vite + TypeScript · Express + Prisma + PostgreSQL · Stripe-hosted
Checkout. **Test mode only — no real payment is ever processed.**

> **Live demo:** _add your URL here_
> **API health:** _add your API URL_`/api/health`

---

## The core principle

The client is never trusted with anything that affects money or access.

- The browser sends **product IDs and quantities only**. There is no price
  field in the checkout schema, so the server cannot be tricked into honouring
  a client-supplied amount.
- An order becomes `PAID` only when a Stripe webhook arrives with a valid HMAC
  signature **and** a payment status proving funds were captured.
- Reaching the success page changes nothing — it is a read-only view of
  authoritative server state.
- Admin capability is enforced server-side; hiding a link in the UI is
  cosmetic, never a control.

---

## Stack

**Frontend** — React 18, Vite 5, TypeScript (strict), React Router 6, Tailwind
CSS, shadcn/ui over Radix primitives, TanStack Query, React Hook Form + Zod,
Axios, Zustand (cart, persisted).

**Backend** — Node 20+, Express 4, TypeScript (strict), Prisma 5, PostgreSQL
16, Zod validation, Stripe Node SDK 17, bcryptjs, JWT in an httpOnly cookie,
Helmet, express-rate-limit, Pino (structured logs with redaction).

**Testing** — Vitest, Supertest, React Testing Library. **170 tests, all
passing.**

---

## Quick start

Prerequisites: Node 20+, PostgreSQL 16, npm 10+, and the Stripe CLI.

```bash
git clone <repo-url> nova-market
cd nova-market
npm install                      # installs both workspaces

cp .env.example server/.env      # then fill in the values below
createdb nova_market
createdb nova_market_test        # the test suite refuses any db without "test" in the name

cd server
npx prisma generate
npm run db:migrate
npm run db:seed                  # 6 products, 1 admin, 1 customer

cd ..
npm run dev                      # API :4000 · storefront :5173
```

Required in `server/.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Session signing key, 32+ chars |
| `STRIPE_SECRET_KEY` | Your `sk_test_...` key |
| `STRIPE_WEBHOOK_SECRET` | The `whsec_...` signing secret |
| `CLIENT_URL` | Used to build Stripe success/cancel URLs |
| `CORS_ORIGINS` | Comma-separated allow-list |

The server validates its whole environment with Zod at boot and **refuses to
start** on anything missing — a missing secret fails loudly instead of silently
disabling a check.

**Seed accounts:** `admin@novamarket.test` / `Admin123!change` ·
`customer@novamarket.test` / `Customer123!`

---

## Stripe setup and webhook testing

Get your secret key from <https://dashboard.stripe.com/test/apikeys> (test
mode), then run the CLI listener in its own terminal:

```bash
stripe login
stripe listen --api-key sk_test_... \
  --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,payment_intent.payment_failed \
  --forward-to localhost:4000/api/webhooks/stripe
```

Put the `whsec_...` it prints into `server/.env` and restart the server.

> Passing `--api-key` matters: it binds the listener to the same Stripe account
> the secret key belongs to. Without it the CLI may listen to a different
> sandbox and no events ever arrive.

Pay with `4242 4242 4242 4242`, any future expiry and CVC. Other test cards:
`4000 0000 0000 0002` (declined), `4000 0025 0000 3155` (3-D Secure).

**Verify idempotency by hand:**

```bash
stripe events resend evt_1ABC...
```

The API returns `{"outcome":"duplicate"}`, no second payment row is written,
and stock is not decremented again.

---

## Payment flow

1. `POST /api/checkout` receives `{ items: [{ productId, quantity }] }`
2. Server validates the cart against the database — existence, active status,
   stock, single currency — and **recomputes every total from the products
   table**
3. One transaction creates a `PENDING` order, its item snapshots, and a
   `PENDING` payment
4. A Stripe Checkout Session is created with an idempotency key,
   `metadata.orderId` and `client_reference_id`; its URL is returned
5. The browser redirects to Stripe-hosted Checkout
6. Stripe redirects back to `/checkout/success`, which **only reads** status
   and polls `GET /api/orders/by-session`
7. `POST /api/webhooks/stripe` arrives, the signature is verified against the
   raw body, and only then is the order marked `PAID` and stock decremented

The customer frequently beats the webhook back from Stripe. That is normal, and
the success page shows a pending state rather than falsely claiming success.

---

## Tests

```bash
npm test                     # everything

cd server
npm run test:unit            # 31 — pure functions + real Stripe signature crypto, no database
npm run test:integration     # 109 — Supertest against a real PostgreSQL test database

cd client
npm run test:run             # 30 — components, cart store, money conversion
```

Highlights of what is covered: tampered client prices ignored; insufficient
stock, inactive products and mixed currencies rejected; stock **not** decremented
at session creation; webhook signature accepted, rejected on tamper, wrong
secret and stale timestamp; duplicate delivery and five concurrent deliveries
handled; a paid order never downgraded by a later failure event; order
ownership returning 404 rather than 403; and revenue excluding pending, failed,
cancelled, expired and refunded orders.

Seven unit tests run Stripe's **real** HMAC verification — including proof that
re-serialising the JSON body breaks the signature, which is exactly why the
webhook route uses `express.raw()`.

---

## API

Base URL `/api`. One envelope everywhere:

```jsonc
{ "success": true, "data": { ... }, "meta": { "pagination": { ... } } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

Auth is a JWT in an httpOnly cookie; state-changing requests must echo the
`nova_csrf` cookie in an `X-CSRF-Token` header (the Axios interceptor does this
automatically).

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | A client-supplied `role` is ignored |
| POST | `/auth/login` | — | Sets session + CSRF cookies |
| POST | `/auth/logout` | — | |
| GET | `/auth/me` | user | Re-read from the database |
| GET | `/products` | — | `page`, `limit`, `category`, `search`, `sort` |
| GET | `/products/categories` | — | |
| GET | `/products/:id` | — | By UUID **or** slug |
| POST | `/checkout` | user | Creates pending order + Checkout Session |
| POST | `/checkout/validate` | user | Server-computed totals, no order created |
| POST | `/webhooks/stripe` | signature | `200` ack · `400` bad signature · `5xx` retry |
| GET | `/orders` | user | Own orders only |
| GET | `/orders/by-session` | user | Plus `awaitingConfirmation` |
| GET | `/orders/:id` | user | Another customer's id returns `404` |
| GET | `/admin/stats` | admin | Revenue counts `PAID` only |
| GET/POST/PUT/DELETE | `/admin/products[/:id]` | admin | Delete archives if ordered |
| GET | `/admin/orders[/:id]` | admin | With customer and Stripe references |

---

## Security

**Passwords** — bcrypt cost 12. The hash never leaves the server. Login runs a
dummy comparison for unknown accounts so timing doesn't reveal which emails are
registered, and both failure branches return an identical message.

**Sessions** — signed JWT (issuer and audience pinned) in an `httpOnly` cookie,
`secure` in production, `SameSite=Lax`. Lax is deliberate: returning from
Stripe is a top-level cross-site navigation, and a `Strict` cookie would not be
sent, logging the customer out at the worst moment. The user is re-read from
the database on every request, so a role change takes effect immediately.

**CSRF** — double-submit token compared with `crypto.timingSafeEqual`. A
cross-origin page can cause a request to be sent but cannot read our cookie to
populate the header.

**Authorization** — `requireAuth` + `requireAdmin` applied with `router.use`
across all of `/api/admin`, so no route can be added without them. Customer
order queries scope by `userId` inside the `WHERE` clause, making ownership a
property of the query rather than a check that could be forgotten.

**Payment integrity** — prices read from the database on every checkout;
monetary values are integers in minor units end to end; captured amount and
currency are compared against the recorded order and a mismatch is logged. No
Stripe key is needed in the client at all, and no card data touches our servers
or logs.

**Webhook integrity** — `express.raw()` is mounted on the webhook route
*before* `express.json()` and above the CSRF middleware (Stripe can't hold our
token — the signature *is* its authentication). Unverified payloads are
rejected with `400` and never reach the database.

**Idempotency — three independent layers:**

1. `webhook_events.stripeEventId` is `UNIQUE` and inserted **inside the same
   transaction as the side effects**. A replay fails the insert and the whole
   transaction rolls back. Because ledger and effects share a transaction, a
   crash mid-processing rolls back both, so Stripe's retry reprocesses cleanly
   instead of finding the event falsely marked handled.
2. Status transitions use `updateMany` filtered on current status — atomic
   compare-and-set. A concurrent delivery that arrives second changes nothing.
3. `payment.upsert` is keyed on the unique `orderId`.

Stock decrements additionally guard with `where: { stock: { gte: quantity } }`,
so they can never run twice or drive stock negative.

**Also** — Helmet headers, `x-powered-by` disabled, explicit CORS allow-list
with `credentials: true` (a disallowed origin gets a structured `403`), `trust
proxy` for correct rate-limit IPs, 100 kB body cap, rate limits of 300/15 min
globally and 20/15 min on auth. All queries go through Prisma's parameterised
builder; the one raw `date_trunc` aggregation uses a tagged template. Pino
redacts cookies, auth headers, the Stripe signature and password fields.

---

## Database

Six tables. **Every monetary column is an `INTEGER` of minor units** — `24999`
is `$249.99`. No float appears anywhere, which removes a class of rounding bugs
and matches the unit Stripe's API expects.

| Table | Notable constraints |
|---|---|
| `users` | `email` UNIQUE — duplicates prevented by the database, not a read-then-write check |
| `products` | `slug` UNIQUE; indexed on `category`, `isActive`, `createdAt` |
| `orders` | `orderNumber` UNIQUE; `stripeCheckoutSessionId` UNIQUE so one session can never attach to two orders |
| `order_items` | Product **snapshot** at purchase time; `productId` nullable `ON DELETE SET NULL` |
| `payments` | `orderId` UNIQUE — what makes the webhook's `upsert` safe |
| `webhook_events` | `stripeEventId` UNIQUE — the idempotency enforcement point |

**Deliberate decisions:** order items are snapshotted so later catalogue edits
can't rewrite history; a product that appears in any order is archived rather
than deleted; stock is decremented at payment confirmation, not session
creation, so an abandoned checkout can't hold inventory hostage; `subtotalCents`
is kept separate from `totalAmountCents` so shipping or tax can be added without
a migration.

---

## Screenshots

**Cart** — totals shown here are for display; the server recomputes them at
checkout.

![Cart with line items](docs/screenshots/cart.png)

**Awaiting the webhook** — the customer arrived before Stripe's event. The page
polls rather than claiming success.

![Success page awaiting webhook confirmation](docs/screenshots/success-pending.png)

**Confirmed** — the verified webhook marked the order `PAID`, and the page
updated without a reload.

![Success page after payment confirmed](docs/screenshots/success.png)

---

## Docker

```bash
docker compose up --build        # Postgres + API + nginx-served frontend
docker compose exec server npx prisma db seed
```

Storefront on :8080, API on :4000. Migrations run automatically via
`prisma migrate deploy` (never `migrate dev`, so a container start can't reset
data). Both images are multi-stage; the API ships production dependencies only
and runs as the unprivileged `node` user.

---

## Deployment

Database: any managed PostgreSQL 16. Run `npx prisma migrate deploy` in the
release step. API: any Node host or the provided Dockerfile. Frontend: any
static host.

Three things that must be right:

- `COOKIE_SAME_SITE=none` when the API and frontend are on different domains
  (requires HTTPS, which production cookies already assume)
- `CORS_ORIGINS` and `CLIENT_URL` must be the exact frontend origin — Stripe's
  redirects are built from `CLIENT_URL`
- `VITE_API_URL` is inlined at **build** time, so it must be set before
  `npm run build`, not at runtime

Create a Stripe webhook endpoint at `https://your-api/api/webhooks/stripe`
subscribed to the five events listed above, and use **its** signing secret —
each endpoint has its own, so a local CLI secret will not verify in production.

---

Built as a technical assessment. Stripe test mode only.