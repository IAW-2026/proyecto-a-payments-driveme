# Auditoría de API — DriveMe Payments

## Por qué existen las rutas redundantes — cronología real (git verificado)

### El problema original
Las rutas de producción (`/api/pagos/transacciones` POST y PUT) solo aceptaban service tokens (`RIDER_SERVICE_SECRET`, `DRIVER_SERVICE_SECRET`). Desde el browser era imposible llamarlas sin esos tokens, lo que bloqueaba el testeo del flujo completo.

### Solución en iteración 1 — `af58fc2` (13 May)
Se crean rutas separadas en `admin/test/procesar` y `admin/test/liquidar` que aceptaban admin Clerk JWT. Era la **única solución posible en ese momento**: no existía ningún mecanismo de bypass, y estas rutas permitían testear la lógica de producción desde el panel admin.

### Iteración 2 — `7373f49` (19 May)
Reestructuración: se renombran a `admin/test/transacciones` y `admin/test/liquidaciones`.

### Iteración 3 — `8605ac3` (28 May) ← donde nació la redundancia
Al crear el panel `/debug`, se tomaron dos decisiones en el mismo commit:
1. Se agrega soporte de **admin JWT directamente a las rutas de producción** (el bypass que no existía antes)
2. Se crea una **nueva ruta** `/api/pagos/debug/transacciones` para los forms de testing de transacciones
3. Para liquidaciones, en cambio, el form nuevo apunta **directo al endpoint real** (coherente con el nuevo bypass)

El resultado: la ruta `debug/transacciones` nació redundante porque en el mismo commit ya se había resuelto el problema que la justificaba. Y las rutas `admin/test/*` quedaron huérfanas porque los nuevos forms las reemplazaron sin borrarlas.

### Iteración 4 — `86f1eda` (28 May, mismo día)
Code depuration: se limpian `TestLiquidarForm`, `TestProcesarForm`, `SeedBancoForm`, `UpdateBilleteraForm`, `UpdateTransaccionForm`, y sus routes correspondientes. Las rutas `admin/test/*` sobrevivieron esta limpieza (se modificaron pero no se borraron).

### Resumen del error de diseño
No es un error conceptual sino un **refactor incompleto**: la decisión de crear rutas separadas de testing fue correcta dado que no existía el bypass. Cuando se agregó el bypass a producción, la limpieza de las rutas de testing quedó a medias. La inconsistencia (liquidaciones apunta al real, transacciones no) es evidencia de que la decisión se tomó de forma no uniforme en el mismo commit.

---

## Mapa completo de rutas

### Rutas en uso

| Ruta | Método | Quién la llama | Auth |
|------|--------|----------------|------|
| `/api/pagos/transacciones` | POST | Driver/Rider App (producción) | `RIDER_SERVICE_SECRET` |
| `/api/pagos/transacciones` | PUT | Driver/Rider App (producción) | `DRIVER_SERVICE_SECRET` / `RIDER_SERVICE_SECRET` |
| `/api/pagos/transacciones` | GET | `MockGetTransaccionesForm` (debug) | Admin JWT + `userId` param |
| `/api/pagos/liquidaciones` | POST | `TestPostLiquidacionForm` (debug) | Admin JWT |
| `/api/pagos/liquidaciones` | GET | `MockGetLiquidacionesForm` (debug) | Admin JWT |
| `/api/pagos/debug/transacciones` | POST | `TestPostTransaccionForm` (debug) | Admin JWT |
| `/api/pagos/debug/transacciones` | PUT | `TestPutTransaccionForm` (debug) | Admin JWT + `perspectiva` |
| `/api/pagos/admin/seed/transaccion` | POST | `SeedTransaccionForm` (debug) | Admin JWT |
| `/api/pagos/admin/seed/billetera` | POST | `SeedBilleteraForm` (debug) | Admin JWT |
| `/api/pagos/admin/seed/preview` | GET | `QuickPreview` (debug) | Admin JWT |
| `/api/pagos/admin/reset` | POST | `ResetPanel` (debug) | Admin JWT |
| `/api/pagos/admin/users` | GET | `UserIdSelect` (debug, carga al montar) | Admin JWT |
| `/api/pagos/admin/users/[userId]/role` | PATCH | `RoleForm` (debug) | Admin JWT |
| `/api/pagos/admin/sync-clerk-users` | POST | `SyncClerkUsersForm` (debug) | Admin JWT |
| `/api/webhooks/mercadopago` | POST | Mercado Pago (externo) | Ninguna — validar payload |
| `/api/webhooks/clerk` | POST | Clerk (externo) | Svix signature |

### Rutas huérfanas — no llamadas desde ningún lugar

| Ruta | Método | Motivo de existencia probable |
|------|--------|-------------------------------|
| `/api/pagos/admin/test/transacciones` | POST | Iteración anterior al panel debug actual |
| `/api/pagos/admin/test/liquidaciones` | POST | Iteración anterior al panel debug actual |

### Rutas redundantes — existen pero duplican lógica ya accesible

| Ruta | Por qué es redundante |
|------|----------------------|
| `/api/pagos/debug/transacciones` (POST + PUT) | La ruta de producción `/api/pagos/transacciones` ya acepta admin JWT con el campo `perspectiva`. Los forms de debug podrían apuntar directamente a la ruta de producción, como sí hace `TestPostLiquidacionForm` con liquidaciones. |

---

## Quién llama a quién — diagrama por página

### Página `/admin` (server component, sin fetch del browser)
Lee Prisma directamente en el servidor. No llama ningún endpoint de API.

```
/admin?tab=fondos       → prisma.bancoCentral + prisma.billetera + prisma.liquidacion
/admin?tab=transacciones → prisma.transaccion
/admin?tab=usuarios     → prisma.usuario
```

### Página `/debug` (client components con fetch)

**Tab Seed:**
```
SeedTransaccionForm  → POST /api/pagos/admin/seed/transaccion
SeedBilleteraForm    → POST /api/pagos/admin/seed/billetera
QuickPreview         → GET  /api/pagos/admin/seed/preview
```

**Tab Update (roles):**
```
RoleForm             → PATCH /api/pagos/admin/users/{userId}/role
SyncClerkUsersForm   → POST  /api/pagos/admin/sync-clerk-users
UserIdSelect         → GET   /api/pagos/admin/users  (carga al montar el componente)
```

**Tab Reset:**
```
ResetPanel           → POST /api/pagos/admin/reset
```

**Tab Endpoints (simula flujo de producción paso a paso):**
```
TestPostTransaccionForm  → POST /api/pagos/debug/transacciones
TestPutTransaccionForm   → PUT  /api/pagos/debug/transacciones
TestPostLiquidacionForm  → POST /api/pagos/liquidaciones  ← apunta al real
```

**Tab Mocks GET (simula respuesta según rol):**
```
MockGetTransaccionesForm → GET /api/pagos/transacciones  ← apunta al real
MockGetLiquidacionesForm → GET /api/pagos/liquidaciones  ← apunta al real
```

### Flujo externo — outbound fetches del servidor

```
webhook mercadopago confirmado  → fire-and-forget → RIDER_APP_URL/api/viajes/{id}/pago-confirmado
transacciones PUT (EFECTIVO)    → fire-and-forget → RIDER_APP_URL/api/viajes/{id}/pago-confirmado
debug/transacciones PUT         → fire-and-forget → RIDER_APP_URL/api/viajes/{id}/pago-confirmado
/pago/exito page                → fire-and-forget → RIDER_APP_URL/api/viajes/{id}/pago-confirmado
```

---

## Recomendaciones para la próxima iteración

### 1. Eliminar rutas huérfanas
Borrar sin impacto:
- `src/app/api/pagos/admin/test/transacciones/route.ts`
- `src/app/api/pagos/admin/test/liquidaciones/route.ts`

### 2. Eliminar la ruta de debug redundante
`/api/pagos/debug/transacciones` duplica la lógica de `/api/pagos/transacciones`, que ya acepta admin JWT.  
Cambiar `TestPostTransaccionForm` y `TestPutTransaccionForm` para que apunten a `/api/pagos/transacciones` (igual que los forms de liquidaciones apuntan al real), y borrar `src/app/api/pagos/debug/transacciones/route.ts`.

### 3. Resultado final de rutas
Después de la limpieza, quedarían solo rutas con responsabilidades claras:

| Grupo | Rutas |
|-------|-------|
| **Producción** (inter-servicio) | `/api/pagos/transacciones` (POST/PUT/GET), `/api/pagos/liquidaciones` (POST/GET) |
| **Admin/Debug** (herramientas) | `/api/pagos/admin/seed/*`, `/api/pagos/admin/reset`, `/api/pagos/admin/users`, `/api/pagos/admin/sync-clerk-users` |
| **Webhooks** (externos) | `/api/webhooks/mercadopago`, `/api/webhooks/clerk` |
