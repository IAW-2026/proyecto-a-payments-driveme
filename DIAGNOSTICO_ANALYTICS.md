# Diagnóstico — Analytics Dashboard + Payments App

> **Contexto para la AI del proyecto `etapa-3-analytics-dashboard-driveme`.**  
> Los endpoints y el schema de Payments App cambiaron en la Etapa 3. Este documento describe qué está roto, por qué, y qué hay que corregir.

---

## Por qué los datos aparecen en 0

**Causa probable — schema/client mismatch en Vercel:**

La base de datos remota (Supabase) fue actualizada con `prisma db push` para incluir los cambios de la Etapa 3: `idViaje` e `idConductor` en la tabla `transaccion` ahora son nullable, y se agregó la columna `idSolicitud`. La Payments App desplegada en Vercel sigue usando el **Prisma client anterior** (generado del schema viejo).

Prisma v7 con el adaptador `PrismaPg` puede fallar en runtime si el schema del cliente no coincide con la DB real. Esto hace que las queries fallen y la Payments App devuelva errores 500 al Analytics Dashboard, que los maneja silenciosamente mostrando 0.

**Fix inmediato:** Deploy de la Payments App actualizada a Vercel. El Prisma client regenerado con el nuevo schema resolverá el mismatch.

**Segunda causa posible — `PAYMENTS_SERVICE_SECRET` incorrecto:**

El Dashboard envía `process.env.PAYMENTS_SERVICE_SECRET` como `Authorization: Bearer`. La Payments App valida ese valor contra `process.env.CONTROL_PLANE_SECRET`. Si los valores no son iguales en los entornos respectivos (Vercel env vars), todos los GET requests devuelven 401 y el dashboard no obtiene datos.

Verificar que ambos valores coinciden tanto en local (`.env.local`) como en las variables de entorno de Vercel.

---

## Cambios en la interfaz `Transaccion`

Archivo afectado: `src/lib/services/payments.ts` (lines 16–27)

```typescript
// ANTES (incorrecto a partir de Etapa 3):
export interface Transaccion {
  id: string
  idViaje: string             // ← era required, ahora puede ser null
  idPasajero: string
  idConductor: string         // ← era required, ahora puede ser null
  metodoPago: 'EFECTIVO' | 'MERCADO_PAGO'
  monto: number
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
  estadoLiquidacion: 'PENDIENTE' | 'LIQUIDADO'
  fechaCreacion: string
  fechaActualizacion: string
}

// DESPUÉS (correcto):
export interface Transaccion {
  id: string
  idViaje: string | null        // nullable: transacciones MP no tienen viaje hasta que el conductor termina el viaje
  idSolicitud: string | null    // nuevo campo — ID de la SolicitudDeViaje en Rider App
  idPasajero: string
  idConductor: string | null    // nullable: transacciones MP no tienen conductor hasta que acepta la solicitud
  metodoPago: 'EFECTIVO' | 'MERCADO_PAGO'
  monto: number
  estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO'
  estadoLiquidacion: 'PENDIENTE' | 'LIQUIDADO'
  fechaCreacion: string
  fechaActualizacion: string
}
```

---

## Componentes con accesos inseguros a idViaje e idConductor

Los siguientes archivos acceden a estos campos sin null guard y pueden crashear o mostrar `undefined` en la UI con transacciones MERCADO_PAGO recientes:

| Archivo | Línea | Campo | Fix |
|---------|-------|-------|-----|
| `TransaccionesFullTable.tsx` | ~84 | `tx.idViaje` | `tx.idViaje?.slice(0, 8) ?? '—'` |
| `TransaccionesFullTable.tsx` | ~108 | `tx.idConductor` | `tx.idConductor ?? '(sin asignar)'` |
| `ConductoresView.tsx` | ~51, 61 | `tx.idConductor` | null guard + filtrar transacciones donde idConductor !== null |
| `PasajerosView.tsx` | ~52, 53 | usages de idConductor | null guard |

**Búsqueda rápida para encontrar todos los accesos:**
```
grep -rn "\.idViaje\b" src/
grep -rn "\.idConductor\b" src/
```

**Patrón de fix recomendado:**
```tsx
// En tablas — mostrar placeholder:
<td>{tx.idViaje ? tx.idViaje.slice(0, 8) + '…' : <span style={{color:'var(--muted)'}}>—</span>}</td>

// Para filtros por conductor — excluir nulls:
const txsDelConductor = transacciones.filter(tx => tx.idConductor === conductorId)

// Para aggregate/sumas — null-safe:
tx.idConductor ?? 'desconocido'
```

---

## Comportamiento esperado por método de pago

Con los nuevos flujos, el Analytics Dashboard verá dos tipos de transacciones:

| Campo | EFECTIVO | MERCADO_PAGO (antes de terminar viaje) | MERCADO_PAGO (después del PATCH) |
|-------|----------|---------------------------------------|----------------------------------|
| `idViaje` | string | **null** | string |
| `idSolicitud` | string | string | string |
| `idConductor` | string | **null** | string |
| `estado` | `CONFIRMADO` | `CONFIRMADO` | `CONFIRMADO` |
| `estadoLiquidacion` | `PENDIENTE` | `PENDIENTE` | `PENDIENTE` |

Las transacciones MP en estado `CONFIRMADO` con `idConductor: null` son legítimas — representan un pago aprobado donde el viaje aún no terminó (el conductor no hizo el PATCH). Esto no es un error.

---

## GET endpoints — sin cambios en contrato

El Dashboard solo usa GETs. Ninguno de esos contratos cambió:

| Endpoint | Query params | Estado |
|----------|-------------|--------|
| `GET /api/pagos/transacciones` | `estado`, `estadoLiquidacion`, `idConductor`, `idPasajero` | Sin cambios |
| `GET /api/pagos/admin/billeteras` | `?idConductor=` opcional | Sin cambios |
| `GET /api/pagos/admin/banco-central` | — | Sin cambios |
| `GET /api/pagos/admin/users` | — | Sin cambios |
| `GET /api/pagos/liquidaciones` | `?idConductor=` opcional | Sin cambios |

---

## Checklist de fix

- [ ] Deploy Payments App a Vercel (resuelve el 0-data por schema mismatch en Prisma)
- [ ] Verificar que `PAYMENTS_SERVICE_SECRET` (Analytics) == `CONTROL_PLANE_SECRET` (Payments App) en Vercel env vars
- [ ] Actualizar interfaz `Transaccion` en `src/lib/services/payments.ts`: `idViaje` y `idConductor` pasan a `string | null`, agregar `idSolicitud: string | null`
- [ ] Agregar null guards en `TransaccionesFullTable.tsx` para `idViaje` (~line 84) y `idConductor` (~line 108)
- [ ] Revisar `ConductoresView.tsx` y `PasajerosView.tsx` — filtrar o guardar nulls antes de operar sobre idConductor
- [ ] Considerar mostrar badge o indicador visual para transacciones MP sin conductor asignado aún
