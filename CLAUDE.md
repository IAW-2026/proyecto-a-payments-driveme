# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint

npm run db:generate  # regenerate Prisma client after schema changes
npm run db:push      # push schema to DB without a migration (dev only)
npm run db:migrate   # create and apply a migration
npm run db:studio    # open Prisma Studio
```

> **School network SSL fix**: prefix any `npm` or `npx` command with `$env:NODE_OPTIONS="--use-system-ca"` in PowerShell to avoid `UNABLE_TO_VERIFY_LEAF_SIGNATURE` errors.

## Architecture

**Payments App** is one of four microservices in the DriveMe transport platform (IAW 2026). Each app has its own database; inter-service communication is via HTTP using Clerk JWTs for auth.

### Key wiring

| File | Role |
|------|------|
| `src/proxy.ts` | Clerk middleware implementation (`clerkMiddleware()`) |
| `src/middleware.ts` | One-liner re-export of `proxy.ts` so Next.js picks it up |
| `src/lib/auth.ts` | Re-exports `auth`, `currentUser`, `clerkClient` from `@clerk/nextjs/server` — all server components import Clerk from here |
| `src/lib/prisma.ts` | Singleton `PrismaClient` with `PrismaPg` driver adapter (required by Prisma v7) |
| `prisma/schema.prisma` | Schema with `output = "../src/generated/prisma"` — client lands in `src/generated/prisma/` |
| `prisma.config.ts` | Prisma CLI config: `datasource.url` only. The `PrismaPg` adapter belongs in `prisma.ts`, not here |

### Prisma v7 specifics

- Import PrismaClient from `@/generated/prisma/client` (not `@/generated/prisma` or `@prisma/client`)
- `schema.prisma` uses `provider = "prisma-client-js"` and no `url` in the datasource block
- After any schema change, run `db:generate` to rebuild the client

### Auth and roles

Clerk is the single identity provider across all four apps. Roles live in Clerk `publicMetadata.role`:

- `rider` — passengers (can add payment methods, request refunds)
- `driver` — drivers (triggers payment processing via `POST /api/pagos/procesar`)
- Clerk `sub` is used as the shared user ID across all services

### Payments App endpoints (exposed to other services)

| Endpoint | Caller | Description |
|----------|--------|-------------|
| `POST /api/pagos/procesar` | Driver App | Charge passenger at trip end; returns `id_transaccion` and `CAPTURED\|PENDING` |
| `POST /api/pagos/methods` | Rider App | Add a payment method (tokenized by gateway) |
| `POST /api/pagos/{id_transaccion}/refunds` | Rider App | Request a refund |

After processing, Payments App notifies Rider App at `POST /api/viajes/{id_viaje}/pago-confirmado`.

### Payments App data model

- **MetodoPago**: gateway token, type (`TARJETA`/`EFECTIVO`), linked to Clerk `sub`
- **Tarjeta**: masked PAN, expiry, brand — child of MetodoPago
- **Transaccion**: amount, currency (ISO 4217), gateway status (`PENDING`/`AUTHORIZED`/`CAPTURED`/`FAILED`/`REFUNDED`/`CANCELED`), full gateway response in a JSON `detalle_gateway` column
- **Reembolso**: partial or full refund linked to a Transaccion; status (`PENDING`/`COMPLETED`/`FAILED`/`REVERSED`)

Raw card data is never stored — only gateway tokens and masked PANs.
