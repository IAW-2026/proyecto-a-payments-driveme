# DriveMe — Payments App: Codebase Guide

> Organized by logical flows, not by file. Each section explains what the user sees, what route handles it, and what happens in the database.

---

## 1. Overview

This is the **Payments microservice** of the DriveMe platform (4-app architecture: Riders, Drivers, Payments, Maps). It handles:

- Payment processing at trip end (cash or Mercado Pago)
- Driver wallet accounting (Billetera)
- Weekly driver payouts (Liquidaciones)
- Passenger refunds
- Platform fund tracking (BancoCentral)

Other services talk to this app over HTTP using Clerk JWTs for cross-service auth. Mercado Pago talks back via a public webhook.

**Stack**: Next.js 15 (App Router) · Prisma v7 + Neon PostgreSQL · Clerk v6 · Mercado Pago Node SDK · Tailwind v4

---

## 2. Auth & Middleware

**Entry point**: every request passes through [`src/middleware.ts`](src/middleware.ts), which re-exports [`src/proxy.ts`](src/proxy.ts).

`proxy.ts` uses `clerkMiddleware()` and applies `auth.protect()` to these path prefixes:

| Protected prefix | Who uses it |
|---|---|
| `/metodos` | Rider: add payment method |
| `/transacciones` | Driver: process payment |
| `/fondos` | Any authenticated user: view financial dashboard |
| `/admin` | Admin: seed/test/manage data |

The only public route is `/api/webhooks(.*)` — Mercado Pago and Clerk need to POST there without a user session.

All server-side code imports Clerk from [`src/lib/auth.ts`](src/lib/auth.ts), which re-exports `auth`, `currentUser`, and `clerkClient` from `@clerk/nextjs/server`. This is the single import point so the alias never leaks.

**Roles** live in Clerk `publicMetadata.role` and are mirrored to the local `Usuario` table (see §3). The three roles are `RIDER`, `DRIVER`, `ADMIN`. Role logic is centralised in [`src/lib/roles.ts`](src/lib/roles.ts):

- `getUserRole(userId)` — reads the role from the local DB
- `ensureUser(userId, rol)` — upserts a `Usuario` row if it doesn't exist yet, used at the start of protected routes

---

## 3. Data Model

Schema lives in [`prisma/schema.prisma`](prisma/schema.prisma). Generated client lands in `src/generated/prisma/` (not `@prisma/client`).

### Core entities

```
Usuario          — mirrors Clerk user; holds rol (RIDER | DRIVER | ADMIN)
Transaccion      — one payment per trip; holds gateway status + full gateway JSON
Reembolso        — zero-or-one per Transaccion; tracks refund lifecycle
Billetera        — one per driver; accumulates weekly and historical earnings
Liquidacion      — one record per weekly payout; linked to Billetera
BancoCentral     — singleton row; company-wide fund totals
```

### Status enums

| Model | Enum | Values |
|---|---|---|
| Transaccion | EstadoTransaccion | `PENDIENTE · CONFIRMADO · CANCELADO · REEMBOLSADO` |
| Reembolso | EstadoReembolso | `PENDING · COMPLETED · FAILED · REVERSED` |
| Liquidacion | EstadoLiquidacion | `PENDIENTE · PROCESADA · FALLIDA` |

### Financial split (constant throughout the whole app)

Every confirmed payment is split:
- **90% → driver** (`NETO = 0.9`)
- **10% → platform** (`CORTE = 0.1`)

This constant appears in three independent places: the EFECTIVO handler, the Mercado Pago webhook handler, and the admin test endpoint. They all apply it the same way.

### Billetera fields explained

| Field | Meaning |
|---|---|
| `montoSemanaActual` | 90% of all confirmed payments this week |
| `montoRetenidoSemanaActual` | Amount held back from this week because of refunds |
| `montoHistorico` | Cumulative total of all previous weeks' gross earnings |
| `montoRetenidoHistorico` | Cumulative total of all previous weeks' held amounts |
| `montoEfectivoPendiente` | 10% platform cut accumulated from cash payments (driver collected this cash physically; platform debits it later) |

Net payout when liquidating = `montoSemanaActual − montoRetenidoSemanaActual`

### BancoCentral fields explained

| Field | Meaning |
|---|---|
| `fondosADebitar` | Running total the platform owes drivers (grows on each confirmed payment, shrinks on each liquidation) |
| `fondosEmpresa` | Running 10% cut accumulated |
| `fondosDebitadosHistorico` | All-time driver payouts processed |
| `fondosReembolsadosHistorico` | All-time refunds paid out |

---

## 4. Payment Flow: EFECTIVO (Cash)

**Who triggers it**: the Driver App calls `POST /api/pagos/transacciones` at trip end.

**Handler**: [`src/app/api/pagos/transacciones/route.ts`](src/app/api/pagos/transacciones/route.ts)

**Auth check**: Clerk session + role must be `DRIVER`.

```
Request body:
{
  id_viaje:    string,   // trip ID from Driver App
  id_pasajero: string,   // Clerk userId of the passenger
  monto:       number,
  metodo_pago: "EFECTIVO"
}
```

**What happens, step by step**:

1. `ensureUser()` upserts the driver's `Usuario` row.
2. A `Transaccion` row is created with `estado: CONFIRMADO` immediately (cash is always synchronous).
3. Inside a single `prisma.$transaction()`:
   - `Billetera` is upserted for the driver: `montoSemanaActual += monto * 0.9`, `montoEfectivoPendiente += monto * 0.1`.
   - `BancoCentral` singleton is upserted: `fondosADebitar += monto * 0.9`, `fondosEmpresa += monto * 0.1`.
4. A fire-and-forget `fetch` calls the Rider App at `{RIDER_APP_URL}/api/viajes/{id_viaje}/pago-confirmado` to notify the trip has been paid.
5. Returns `{ id_transaccion, estado: "CAPTURED" }` with HTTP 201.

**What the UI shows**: nothing directly — this endpoint is called cross-service. The driver sees a confirmation on their own app.

---

## 5. Payment Flow: Mercado Pago (Card / Digital Wallet)

This is a two-step async flow: create a checkout session → wait for the gateway webhook.

### Step 1 — Create Preference

**Same endpoint**: `POST /api/pagos/transacciones`, same handler, `metodo_pago: "MERCADO_PAGO"`.

1. `Transaccion` is created with `estado: PENDIENTE`.
2. Mercado Pago's `new Preference(mpClient).create(...)` is called using [`src/lib/mercadopago.ts`](src/lib/mercadopago.ts) which holds the configured `mpClient`.
   - `items`: trip amount, quantity 1
   - `back_urls.success/failure/pending`: point to `{MP_BACK_URL_BASE}/pago/exito|falla|pendiente`
   - `notification_url`: `{MP_BACK_URL_BASE}/api/webhooks/mercadopago`
   - `external_reference`: the new `Transaccion.id` (used to link the webhook back)
3. The preference `id` and `init_point` (the hosted checkout URL) are stored in `Transaccion.detalleGateway` (JSON column).
4. Returns `{ id_transaccion, preference_id, init_point, estado: "PENDING" }`.

The Driver App redirects the passenger to `init_point` to complete payment.

### Step 2 — Webhook Confirmation

**Handler**: [`src/app/api/webhooks/mercadopago/route.ts`](src/app/api/webhooks/mercadopago/route.ts) — **no auth** (public).

MP posts `{ type: "payment", data: { id: paymentId } }`.

1. Non-payment event types are ignored (returns 200 immediately).
2. `new Payment(mpClient).get({ id: paymentId })` fetches full payment details.
3. `external_reference` on the payment maps back to `Transaccion.id`.
4. **Idempotency guard**: if `Transaccion.estado !== PENDIENTE`, skip all updates and return 200. This prevents double-processing if MP retries.
5. Inside a single `prisma.$transaction()`:

   | MP status | What happens |
   |---|---|
   | `"approved"` | `Transaccion.estado → CONFIRMADO`, `Billetera` updated (+90%), `BancoCentral` updated (+90%/+10%), Rider App notified |
   | `"rejected"` or `"cancelled"` | `Transaccion.estado → CANCELADO`, no financial updates |
   | anything else | Ignored, returns 200 |

### Payment status pages

After the hosted checkout, Mercado Pago redirects the user to one of:

| Page | Route | What it shows |
|---|---|---|
| Success | [`src/app/(protected)/pago/exito/page.tsx`](src/app/(protected)/pago/exito/page.tsx) | Checkmark, "¡Pago realizado!", `payment_id` from query params |
| Failure | `src/app/(protected)/pago/falla/page.tsx` | Error state |
| Pending | `src/app/(protected)/pago/pendiente/page.tsx` | Waiting state |

These are display-only pages — the actual state update has already happened via the webhook.

---

## 6. Refund Flow

**Who triggers it**: the Rider App calls `POST /api/pagos/[id]/refunds` on behalf of the passenger.

**Handler**: `src/app/api/pagos/[id]/refunds/route.ts`

**Auth check**: Clerk session + role must be `RIDER`.

**Validation**:
- The `Transaccion` must exist.
- `Transaccion.idPasajero` must match the caller's Clerk `userId` (ownership check).
- `Transaccion.estado` must be `CONFIRMADO` (can't refund a pending or cancelled payment).
- Refund amount ≤ original transaction amount.

**What happens inside `prisma.$transaction()`**:

1. `Reembolso` row created with `estado: COMPLETED`.
2. Driver's `Billetera`: `montoSemanaActual -= refundAmount`, `montoRetenidoSemanaActual += refundAmount` (money is held, not destroyed).
3. `BancoCentral`: `fondosReembolsadosHistorico += refundAmount`.
4. `Transaccion.estado → REEMBOLSADO`.

**Effect on next liquidation**: the held amount reduces the driver's net payout. The driver still sees the gross in `montoSemanaActual` but the net (semana − retenido) is what gets paid.

---

## 7. Liquidation Flow

**Who triggers it**: the driver (or the Driver App on their behalf) calls `POST /api/pagos/liquidaciones`.

**Handler**: [`src/app/api/pagos/liquidaciones/route.ts`](src/app/api/pagos/liquidaciones/route.ts)

**Auth check**: Clerk session + role must be `DRIVER`.

**Validation**: net = `montoSemanaActual − montoRetenidoSemanaActual` must be > 0.

**What happens inside `prisma.$transaction()`**:

1. `Liquidacion` row created with `estado: PROCESADA` and the net amount.
2. Driver's `Billetera`:
   - `montoHistorico += montoSemanaActual`
   - `montoRetenidoHistorico += montoRetenidoSemanaActual`
   - `montoSemanaActual = 0` (week reset)
   - `montoRetenidoSemanaActual = 0` (week reset)
3. `BancoCentral`:
   - `fondosADebitar -= netAmount` (platform has paid out)
   - `fondosDebitadosHistorico += netAmount`

**Returns**: `{ id_liquidacion, monto_pagado, estado: "PROCESADA" }`.

The weekly cycle: confirmed payments accumulate → refunds hold back some → at week end the driver triggers a liquidation → week counters reset and historical counters grow.

---

## 8. User Creation (Clerk Webhook)

**Handler**: `src/app/api/webhooks/clerk/route.ts` — **no auth** (public, verified with Svix signature).

On `user.created`:
1. Verifies the webhook signature using `CLERK_WEBHOOK_SECRET` via the Svix library.
2. Sets `publicMetadata.role = "driver"` on the Clerk user.
3. Creates a `Usuario` row in the local DB with `rol: DRIVER`.

All new users are drivers by default. Admins must manually promote a user to `RIDER` or `ADMIN` via the admin panel.

---

## 9. Financial Dashboard (Fondos page)

**Route**: `/fondos` → [`src/app/(protected)/fondos/page.tsx`](src/app/(protected)/fondos/page.tsx)

This is a read-only overview page. It shows:

**Top section — BancoCentral** (platform-wide totals):
- Fondos a debitar (what the platform still owes drivers)
- Fondos empresa (accumulated 10% cut)
- Debitados histórico
- Reembolsados histórico

**Bottom section — driver lookup**:
- Input a driver Clerk `userId` → fetches their `Billetera`
- Shows: semana bruto, retenido, **net** (computed client-side: semana − retenido), histórico, efectivo pendiente
- Shows last 10 `Liquidacion` records for that driver

---

## 10. Transaction History Page

**Route**: `/transacciones` → `src/app/(protected)/transacciones/page.tsx`

- Fetches transactions where the logged-in user is either `idPasajero` or `idConductor` (unified view).
- Paginates at 10 per page.
- For each transaction, shows inline `Reembolso` records.
- Color-coded badges for `EstadoTransaccion` and `EstadoReembolso`.

---

## 11. Admin Panel

**Route**: `/admin` → [`src/app/(protected)/admin/page.tsx`](src/app/(protected)/admin/page.tsx)

**Auth**: ADMIN role. Three tabs:

### Seed tab
For populating the database manually during development/demo. Each form calls a separate endpoint:

| Form | Endpoint | What it does |
|---|---|---|
| SeedTransaccionForm | `POST /api/pagos/admin/seed/transaccion` | Upsert a Transaccion; if CONFIRMADO, auto-updates Billetera + BancoCentral |
| SeedReembolsoForm | `POST /api/pagos/admin/seed/reembolso` | Upsert a Reembolso |
| SeedBilleteraForm | `POST /api/pagos/admin/seed/billetera` | Create/increment a Billetera |
| SeedBancoForm | `POST /api/pagos/admin/seed/banco` | Increment BancoCentral balances |
| QuickPreview | `POST /api/pagos/admin/seed/preview` | Fetch current state of any entity |

### Update tab
For correcting state after testing:

| Form | What it does |
|---|---|
| RoleForm | Assign a Clerk role to any userId |
| UpdateTransaccionForm | Change a Transaccion's estado |
| UpdateReembolsoForm | Change a Reembolso's estado |
| UpdateBilleteraForm | Overwrite Billetera amounts directly |

### Test tab
Full simulated flows that mirror production logic exactly:

**TestProcesarForm** ([`src/app/(protected)/admin/TestProcesarForm.tsx`](src/app/(protected)/admin/TestProcesarForm.tsx))
- Inputs: idViaje (auto-randomized), monto, idPasajero, idConductor, metodoPago
- Calls `POST /api/pagos/admin/test/transacciones`
- Shows before/after snapshots of Billetera and BancoCentral with delta formatting
- For MERCADO_PAGO: shows `preference_id` and `init_point` instead (no wallet changes yet)

**TestLiquidarForm** ([`src/app/(protected)/admin/TestLiquidarForm.tsx`](src/app/(protected)/admin/TestLiquidarForm.tsx))
- First step: lookup driver → see current Billetera + computed net
- Second step: execute liquidation → shows after-state (week reset, histórico incremented, BancoCentral decremented)
- Calls `POST /api/pagos/admin/test/liquidaciones`

---

## 12. Cross-Service Communication

This app sends one outbound call to the Rider App after any payment confirmation:

```
POST {RIDER_APP_URL}/api/viajes/{id_viaje}/pago-confirmado
```

Authentication uses a service-level token mechanism in [`src/lib/service-auth.ts`](src/lib/service-auth.ts) (a shared secret or Clerk machine token — not a user JWT).

This call is fire-and-forget: a failure is logged but does not roll back the payment transaction.

---

## 13. Key Environment Variables

| Variable | Where used |
|---|---|
| `DATABASE_URL` | `src/lib/prisma.ts` — Neon PostgreSQL connection |
| `MP_ACCESS_TOKEN` | `src/lib/mercadopago.ts` — Mercado Pago API client |
| `MP_PUBLIC_KEY` | Client-side MP SDK (if needed) |
| `MP_BACK_URL_BASE` | `transacciones/route.ts` — builds `back_urls` and `notification_url` for MP Preference |
| `RIDER_APP_URL` | `transacciones/route.ts` and webhook — base URL for cross-service POST |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook route — Svix signature verification |
| Clerk env vars | Clerk SDK (CLERK_SECRET_KEY etc.) |

---

## 14. Atomicity Guarantees

Every flow that touches multiple tables is wrapped in `prisma.$transaction()`:

| Flow | Tables inside one transaction |
|---|---|
| EFECTIVO payment | `Billetera` + `BancoCentral` |
| MP webhook (approved) | `Transaccion` + `Billetera` + `BancoCentral` |
| Liquidation | `Liquidacion` + `Billetera` + `BancoCentral` |
| Refund | `Reembolso` + `Billetera` + `BancoCentral` + `Transaccion` |

If any step fails, the entire group rolls back. This prevents the wallet and bank from going out of sync with transaction records.

---

## 15. Flow Summary Table

| Action | Who calls | Endpoint | Sync? | Transaccion final state | Wallet effect |
|---|---|---|---|---|---|
| Cash payment | Driver App | `POST /api/pagos/transacciones` | Yes | CONFIRMADO | +90% week |
| MP payment init | Driver App | `POST /api/pagos/transacciones` | No (pending) | PENDIENTE | none yet |
| MP approved | Mercado Pago | `POST /api/webhooks/mercadopago` | Async | CONFIRMADO | +90% week |
| MP rejected | Mercado Pago | `POST /api/webhooks/mercadopago` | Async | CANCELADO | none |
| Refund | Rider App | `POST /api/pagos/[id]/refunds` | Yes | REEMBOLSADO | −amount, +retenido |
| Liquidation | Driver App | `POST /api/pagos/liquidaciones` | Yes | — (Liquidacion row) | week → 0, histórico grows |
