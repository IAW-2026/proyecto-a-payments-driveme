# Flujos de Pago DriveMe — Contrato de Integración

> **Para:** Payments App (Tomas), Driver App (Vicky), Rider App (Martu)  
> **Versión:** Etapa 3 — reemplaza la sección "Payments App" del archivo `03-apis.md`  
> Este documento es la fuente de verdad para la integración de pagos. Cualquier AI que trabaje en uno de estos proyectos debe leerlo antes de tocar código relacionado con pagos o solicitudes.

---

## Contexto y problema que resuelve

La versión anterior asumía que Rider App conocía `id_viaje` e `id_conductor` al momento de crear la transacción. Eso es imposible: el viaje no existe hasta que un conductor lo acepta. Este documento define los flujos corregidos.

**Regla clave:** los dos flujos (EFECTIVO y MERCADO_PAGO) divergen desde el principio y no comparten pasos.

---

## Auth M2M entre servicios

Cada app que llama a otra se autentica con su propio secret en el header:

```
x-api-key: <SECRET>
```

| Caller | Secret que manda |
|--------|-----------------|
| Rider App | `RIDER_SERVICE_SECRET` |
| Driver App | `DRIVER_SERVICE_SECRET` |
| Payments App | `PAYMENTS_SERVICE_SECRET` |

---

## Cambios de schema necesarios en Payments App

Se debe agregar el campo `idSolicitud` al modelo `Transaccion` en Prisma. Este campo cumple **dos funciones**:
1. Al procesar el pago (EFECTIVO o webhook MP), Payments lo usa para notificar a Rider App.
2. En el flujo MP, Driver App lo pasa en el PATCH final para identificar la transacción a enriquecer — evita que Driver necesite conocer `id_transaccion`.

```prisma
model Transaccion {
  // ... campos existentes ...
  idSolicitud  String?   @unique  // único porque 1 solicitud = 1 transacción
}
```

Después del cambio: `npm run db:migrate`.

---

## Flujo 1 — EFECTIVO

```
Martu (Rider)          Vicky (Driver)         Tomas (Payments)
     |                       |                        |
     |-- crea solicitud -----+                        |
     |   (BUSCANDO_CONDUCTOR)|                        |
     |                       |                        |
     |                       |<-- GET /api/solicitudes (polling)
     |                       |                        |
     |                       |-- POST driver/api/viajes (acepta solicitud)
     |                       |-- POST rider/api/viajes  (sync)
     |      ACEPTADA <--------|                        |
     |                       |                        |
     |<-- polling GET driver/api/viajes/{id}/estado    |
     |                       |                        |
     |                       |-- (conductor confirma fin de viaje)
     |                       |-- POST payments/api/pagos/transacciones
     |                       |   [DRIVER_SERVICE_SECRET, todo en uno]
     |                       |                        |
     |                       |            crea + procesa TX (CONFIRMADO)
     |                       |            acredita billetera conductor (90%)
     |                       |            acumula Banco Central (10%)
     |                       |                        |
     |<-- POST rider/api/solicitudes/{id_solicitud}/pagos
     |   (estado_pago: APROBADO)
     |                       |                        |
```

### Paso a paso EFECTIVO

**1. Rider App (Martu) — sin llamadas externas**
- Crea la solicitud internamente con estado `BUSCANDO_CONDUCTOR`.
- Para EFECTIVO no hay `PENDIENTE_PAGO` — la solicitud es visible para conductores de inmediato.

**2. Driver App (Vicky) — polling de solicitudes**
- `GET rider/api/solicitudes?estado=BUSCANDO_CONDUCTOR`

**3. Driver App (Vicky) — acepta solicitud**
- `POST driver/api/viajes` (interno en Driver App)
- Luego sync: `POST rider/api/viajes` (Rider App endpoint A, ya documentado en `03-apis.md`)
- Rider App mueve la solicitud a `ACEPTADA`

**4. Rider App (Martu) — polling de estado del viaje**
- `GET driver/api/viajes/{id_viaje}/estado` hasta que retorne `FINALIZADO`

**5. Driver App (Vicky) — conductor termina el viaje — llama a Payments**

```
POST payments/api/pagos/transacciones
x-api-key: <DRIVER_SERVICE_SECRET>

{
  "id_viaje":      "uuid-viaje",
  "id_solicitud":  "uuid-solicitud",
  "id_pasajero":   "user_2abc...",
  "id_conductor":  "user_2xyz...",
  "metodo_pago":   "EFECTIVO",
  "monto":         2550.00
}
```

**Respuesta:**
```json
{ "id_transaccion": "uuid-tx", "estado": "CONFIRMADO" }
```

> Esta llamada crea la transacción y la procesa en un solo paso — no se requiere PUT posterior para EFECTIVO.

**6. Payments App (Tomas) — notifica a Rider App**

Payments llama internamente:
```
POST rider/api/solicitudes/{id_solicitud}/pagos
x-api-key: <PAYMENTS_SERVICE_SECRET>

{
  "id_solicitud":  "uuid-solicitud",
  "estado_pago":   "APROBADO",
  "id_transaccion": "uuid-tx",
  "monto":         2550.00
}
```

---

## Flujo 2 — MERCADO PAGO

```
Martu (Rider)          Vicky (Driver)         Tomas (Payments)       MercadoPago
     |                       |                        |                    |
     |-- crea solicitud (PENDIENTE_PAGO, interna)     |                    |
     |                       |                        |                    |
     |-- POST payments/api/pagos/transacciones ------->|                    |
     |      (sin id_viaje ni id_conductor)             |                    |
     |<-- { id_transaccion, estado: PENDIENTE } -------|                    |
     |                       |                        |                    |
     |-- PUT payments/api/pagos/transacciones -------->|                    |
     |      (id_transaccion + id_solicitud)            |                    |
     |<-- { id_transaccion, preference_id, init_point }|                    |
     |                       |                        |                    |
     |-- redirige a init_point ------------------------------------------------>|
     |                       |                        |                    |
     |                       |                        |<-- POST /api/webhooks/mercadopago
     |                       |                        |   confirma TX (CONFIRMADO)
     |                       |                        |   acredita billetera (90%)
     |                       |                        |   acumula Banco Central (10%)
     |                       |                        |                    |
     |<-- POST rider/api/solicitudes/{id}/pagos -------|                    |
     |    (APROBADO)          |                        |                    |
     |                       |                        |                    |
     | solicitud → BUSCANDO_CONDUCTOR                  |                    |
     |                       |                        |                    |
     |                       |<-- GET /api/solicitudes (polling)            |
     |                       |-- POST driver/api/viajes                     |
     |                       |-- POST rider/api/viajes (sync)               |
     |      ACEPTADA <--------|   (sin cambios al contrato actual)           |
     |                       |                        |                    |
     |<-- polling GET driver/api/viajes/{id}/estado    |                    |
     |                       |                        |                    |
     |                       |-- (conductor confirma fin de viaje)          |
     |                       |-- PATCH payments/api/pagos/transacciones ---->|
     |                       |   (id_solicitud + id_viaje + id_conductor)   |
```

### Paso a paso MERCADO PAGO

**1. Rider App (Martu) — crea solicitud internamente**
- La solicitud se crea con estado `PENDIENTE_PAGO` (no visible para conductores aún).

**2. Rider App (Martu) — crea la transacción en Payments**

```
POST payments/api/pagos/transacciones
x-api-key: <RIDER_SERVICE_SECRET>

{
  "id_pasajero":  "user_2abc...",
  "id_solicitud": "uuid-solicitud",
  "metodo_pago":  "MERCADO_PAGO",
  "monto":        2550.00
}
```

**Respuesta:**
```json
{ "id_transaccion": "uuid-tx", "estado": "PENDIENTE" }
```

> `id_viaje` e `id_conductor` no se envían porque aún no existen.

**3. Rider App (Martu) — genera preferencia MP**

```
PUT payments/api/pagos/transacciones
x-api-key: <RIDER_SERVICE_SECRET>

{
  "id_transaccion": "uuid-tx",
  "id_solicitud":   "uuid-solicitud"
}
```

**Respuesta:**
```json
{
  "id_transaccion": "uuid-tx",
  "preference_id":  "pref_xxx",
  "init_point":     "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

> Payments guarda `id_solicitud` en la transacción para usarlo en el webhook posterior.

**4. Rider App (Martu) — redirige al checkout de MP**
- Usa `init_point` para llevar al pasajero al checkout.

**5. MercadoPago — confirma el pago**
- Llama al webhook: `POST payments/api/webhooks/mercadopago`
- Payments confirma la transacción → `CONFIRMADO`
- Payments acredita billetera del conductor (90%) y Banco Central (10%)
- Payments llama a Rider App:

```
POST rider/api/solicitudes/{id_solicitud}/pagos
x-api-key: <PAYMENTS_SERVICE_SECRET>

{
  "id_solicitud":   "uuid-solicitud",
  "estado_pago":    "APROBADO",
  "id_transaccion": "uuid-tx",
  "monto":          2550.00
}
```

**6. Rider App (Martu) — mueve la solicitud a BUSCANDO_CONDUCTOR**
- Ahora es visible para conductores.
- Puede opcionalmente guardar `id_transaccion` recibido del webhook si quiere mostrárselo al pasajero en el historial, pero no es requerido para el flujo.

**7. Driver App (Vicky) — acepta y crea el viaje**
- `GET rider/api/solicitudes?estado=BUSCANDO_CONDUCTOR` (polling)
- `POST driver/api/viajes` → `POST rider/api/viajes` (sync — sin cambios al contrato actual)
- Driver App ya tiene `id_solicitud` en su modelo de viaje desde que aceptó la solicitud.

**8. Driver App (Vicky) — conductor termina el viaje — enriquece la transacción**

```
PATCH payments/api/pagos/transacciones
x-api-key: <DRIVER_SERVICE_SECRET>

{
  "id_solicitud": "uuid-solicitud",
  "id_viaje":     "uuid-viaje",
  "id_conductor": "user_2xyz..."
}
```

**Respuesta:**
```json
{ "id_transaccion": "uuid-tx", "estado": "CONFIRMADO" }
```

> Payments hace lookup de la transacción por `id_solicitud` (campo único). Driver App no necesita conocer ni recibir `id_transaccion` en ningún momento del flujo MP.  
> Este PATCH no mueve fondos — solo completa el registro para trazabilidad y conciliación.

---

## Especificación de endpoints actualizados

### Payments App — `POST /api/pagos/transacciones` (MODIFICADO)

Distingue caller por el secret:

**Si llama Driver App (`DRIVER_SERVICE_SECRET`) — EFECTIVO one-shot:**

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `id_viaje` | string | ✅ |
| `id_solicitud` | string | ✅ |
| `id_pasajero` | string | ✅ |
| `id_conductor` | string | ✅ |
| `metodo_pago` | `"EFECTIVO"` | ✅ |
| `monto` | number | ✅ |

Comportamiento: crea la transacción y la procesa en un solo paso (estado final `CONFIRMADO`). Llama a Rider App `POST /api/solicitudes/{id_solicitud}/pagos` al finalizar.

**Si llama Rider App (`RIDER_SERVICE_SECRET`) — MERCADO PAGO inicial:**

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `id_pasajero` | string | ✅ |
| `id_solicitud` | string | ✅ |
| `metodo_pago` | `"MERCADO_PAGO"` | ✅ |
| `monto` | number | ✅ |

Comportamiento: crea la transacción en estado `PENDIENTE`. No mueve fondos. Devuelve `id_transaccion`.

---

### Payments App — `PUT /api/pagos/transacciones` (MODIFICADO)

Solo aplica a MERCADO PAGO. Solo acepta `RIDER_SERVICE_SECRET`.

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `id_transaccion` | string | ✅ |
| `id_solicitud` | string | ✅ |

Comportamiento: genera preferencia en Mercado Pago. Persiste `id_solicitud` en la transacción. Devuelve `init_point`.

> El campo `perspectiva` del cuerpo ya no es necesario — el caller se identifica por el secret.

---

### Payments App — `PATCH /api/pagos/transacciones` (NUEVO)

Solo aplica a MERCADO PAGO, después de que el viaje termina. Solo acepta `DRIVER_SERVICE_SECRET`.

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `id_solicitud` | string | ✅ |
| `id_viaje` | string | ✅ |
| `id_conductor` | string | ✅ |

Comportamiento: busca la transacción por `idSolicitud` (campo único), actualiza `idViaje` e `idConductor`. No mueve fondos. Devuelve el estado actual de la transacción.

> Driver App ya tiene `id_solicitud` desde que creó el viaje — no necesita que nadie se lo pase en este punto del flujo.

---

### Rider App — `POST /api/viajes` sync (SIN CAMBIOS)

El contrato existente en `03-apis.md` sección Rider A no requiere modificaciones. Driver App no necesita recibir `id_transaccion` porque en el PATCH final usa `id_solicitud`, que ya tiene en su propio modelo de viaje.

---

### Rider App — `POST /api/solicitudes/{id_solicitud}/pagos` (SIN CAMBIOS)

Payments App llama a este endpoint en ambos flujos. El contrato existente en `03-apis.md` sección Rider C es correcto:

```json
{
  "id_solicitud":   "uuid-solicitud",
  "estado_pago":    "APROBADO" | "RECHAZADO",
  "id_transaccion": "uuid-tx",
  "monto":          2550.00
}
```

Para EFECTIVO y para MERCADO PAGO (post-webhook), Payments llama a este endpoint.

---

## Resumen de responsabilidades por app

### Rider App (Martu)
- **EFECTIVO:** crear solicitud → `BUSCANDO_CONDUCTOR`. No llama a Payments en ningún momento.
- **MP:** crear solicitud (`PENDIENTE_PAGO`) → `POST payments/transacciones` → `PUT payments/transacciones` → redirect a `init_point` → esperar confirmación de Payments via `POST /api/solicitudes/{id}/pagos` → mover solicitud a `BUSCANDO_CONDUCTOR`.
- Puede guardar `id_transaccion` recibido en el webhook para mostrar al pasajero, pero no es necesario para el flujo.
- **Sin cambios al endpoint `POST /api/viajes` (sync).**

### Driver App (Vicky)
- **EFECTIVO:** cuando el viaje termina → `POST payments/transacciones` (one-shot con todos los campos incluido `id_solicitud`).
- **MP:** cuando el viaje termina → `PATCH payments/transacciones` con `id_solicitud` (ya disponible en el modelo Viaje), `id_viaje` e `id_conductor`. No necesita `id_transaccion` en ningún momento.
- **Sin cambios al flujo de sincronización con Rider.**

### Payments App (Tomas)
- `POST /api/pagos/transacciones`: bifurcar lógica por secret (DRIVER → one-shot EFECTIVO; RIDER → crear pendiente MP).
- `PUT /api/pagos/transacciones`: solo para RIDER+MP, guardar `id_solicitud` en la transacción.
- `PATCH /api/pagos/transacciones` (nuevo): solo para DRIVER+MP post-viaje, actualizar `idViaje` e `idConductor`.
- Webhook MP: al confirmar pago, llamar a `POST rider/api/solicitudes/{id_solicitud}/pagos`.
- Schema: agregar campo `idSolicitud` (nullable) a `Transaccion`.
- Reemplazar la llamada a `/api/viajes/{id}/pago-confirmado` por `/api/solicitudes/{id_solicitud}/pagos` en el webhook y en el procesamiento EFECTIVO.

---

## Estados de SolicitudDeViaje por flujo

| Evento | EFECTIVO | MERCADO PAGO |
|--------|----------|--------------|
| Martu crea la solicitud | `BUSCANDO_CONDUCTOR` | `PENDIENTE_PAGO` |
| Pago confirmado | — | `BUSCANDO_CONDUCTOR` |
| Vicky acepta | `ACEPTADA` | `ACEPTADA` |
| Viaje finalizado | (estado final según Driver) | (estado final según Driver) |
