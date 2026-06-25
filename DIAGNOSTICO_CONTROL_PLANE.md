# Diagnóstico — Control Plane + Payments App

> **Contexto para la AI del proyecto `etapa-3-control-plane-driveme`.**  
> Los endpoints de Payments App cambiaron en la Etapa 3. Este documento describe qué está roto, por qué, y qué hay que corregir.

---

## Por qué los datos aparecen en 0

**Causa probable — schema/client mismatch en Vercel:**

La base de datos remota (Supabase) fue actualizada con `prisma db push` para incluir los cambios de la Etapa 3 (columnas `idViaje` e `idConductor` ahora nullable, nueva columna `idSolicitud`). La app desplegada en Vercel sigue usando el **Prisma client OLD** generado del schema anterior.

Prisma v7 con el adaptador `PrismaPg` puede fallar en runtime si el schema generado no coincide con la DB real (especialmente con constraints cambiados). Esto hace que las queries fallen silenciosamente y las respuestas lleguen vacías o con error 500 al Control Plane.

**Fix inmediato:** Hacer deploy de la Payments App actualizada a Vercel. El cliente Prisma regenerado con el nuevo schema resolverá el mismatch.

**Segunda causa posible — token mismatch:**

El Control Plane envía `process.env.PAYMENTS_SERVICE_SECRET` como `Authorization: Bearer`. La Payments App valida ese token contra `process.env.CONTROL_PLANE_SECRET`. Verificar que ambos valores son idénticos en los respectivos `.env.local` y en las variables de entorno de Vercel.

---

## Cambios en la interfaz `Transaccion`

El tipo `Transaccion` en `src/lib/services/payments.ts` debe actualizarse:

```typescript
// ANTES (incorrecto a partir de Etapa 3):
export interface Transaccion {
  id: string
  idViaje: string       // ← era required, ahora nullable
  idPasajero: string
  idConductor: string   // ← era required, ahora nullable
  metodoPago: 'EFECTIVO' | 'MERCADO_PAGO'
  monto: string
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
  estadoLiquidacion: 'PENDIENTE' | 'LIQUIDADO'
  gatewayProvider: string | null
  gatewayTransactionId: string | null
  detalleGateway: string | null
  fechaCreacion: string
  fechaActualizacion: string
}

// DESPUÉS (correcto):
export interface Transaccion {
  id: string
  idViaje: string | null        // nullable: MP transactions no tienen viaje hasta que el conductor termina
  idSolicitud: string | null    // nuevo campo — ID de la SolicitudDeViaje en Rider App
  idPasajero: string
  idConductor: string | null    // nullable: MP transactions no tienen conductor hasta que acepta
  metodoPago: 'EFECTIVO' | 'MERCADO_PAGO'
  monto: string
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
  estadoLiquidacion: 'PENDIENTE' | 'LIQUIDADO'
  gatewayProvider: string | null
  gatewayTransactionId: string | null
  detalleGateway: string | null
  fechaCreacion: string
  fechaActualizacion: string
}
```

---

## Componentes que necesitan null guards

Cualquier lugar en el código que acceda directamente a `transaccion.idViaje` o `transaccion.idConductor` sin comprobar si es null puede crashear con transacciones MERCADO_PAGO recientes.

Buscar en el proyecto:
```
grep -r "\.idViaje" src/
grep -r "\.idConductor" src/
```

Para cada ocurrencia, agregar null guard:
```typescript
// Ejemplo — mostrar en tabla:
{tx.idViaje ? tx.idViaje.slice(0, 8) + '…' : '—'}
{tx.idConductor ?? '(sin asignar)'}
```

---

## Cambios en los endpoints POST/PUT (para el botón "Liquidar")

### `POST /api/pagos/liquidaciones` — sin cambios
El Control Plane llama este endpoint con `{ id_conductor }` para liquidar. **No hay cambios** — sigue funcionando igual.

### `GET /api/pagos/transacciones` — sin cambios en contrato
El GET con `CONTROL_PLANE_SECRET` sigue devolviendo todas las transacciones con los mismos query params opcionales (`estado`, `estadoLiquidacion`, `idConductor`, `idPasajero`). La única diferencia es que `idViaje` e `idConductor` pueden ser `null` en transacciones MERCADO_PAGO recientes.

### `GET /api/pagos/admin/billeteras`, `GET /api/pagos/admin/banco-central`, `GET /api/pagos/admin/users` — sin cambios

---

## Nuevos endpoints disponibles (no usados aún por Control Plane)

| Método | Endpoint | Para qué | Caller esperado |
|--------|----------|----------|----------------|
| `POST` | `/api/pagos/transacciones` | Crear TX EFECTIVO (one-shot) | Driver App con `DRIVER_SERVICE_SECRET` |
| `POST` | `/api/pagos/transacciones` | Crear TX MERCADO_PAGO PENDIENTE | Rider App con `RIDER_SERVICE_SECRET` |
| `PUT` | `/api/pagos/transacciones` | Generar preferencia MP | Rider App con `RIDER_SERVICE_SECRET` |
| `PATCH` | `/api/pagos/transacciones` | Enriquecer TX MP post-viaje | Driver App con `DRIVER_SERVICE_SECRET` |

El Control Plane no necesita llamar a ninguno de estos — son endpoints que usan las apps de conductores y pasajeros.

---

## Checklist de fix

- [ ] Deploy Payments App a Vercel (resuelve el 0-data por schema mismatch)
- [ ] Verificar que `PAYMENTS_SERVICE_SECRET` (Control Plane) == `CONTROL_PLANE_SECRET` (Payments App) en Vercel env vars
- [ ] Actualizar interfaz `Transaccion` en `src/lib/services/payments.ts` (idViaje/idConductor nullable, agregar idSolicitud)
- [ ] Buscar y agregar null guards en componentes que usan `idViaje` e `idConductor`
- [ ] Verificar que la tabla de transacciones muestra `—` o similar para transacciones MP sin viaje asignado
