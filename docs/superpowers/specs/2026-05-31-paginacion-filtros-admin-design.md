# Paginación y filtros en panel Admin

**Fecha:** 2026-05-31  
**Scope:** `src/app/(protected)/admin/page.tsx`  
**Estado:** Aprobado, pendiente de implementación

---

## Contexto

El requisito de entrega exige búsqueda y paginación con parámetros en la URL donde aplique. La tab de transacciones ya tiene ambas cosas. Quedan dos gaps naturales:

1. La tab de fondos pagina con `take: 10` pero no muestra controles — paginación incompleta.
2. La tab de transacciones no permite filtrar por estado de la transacción.

---

## Cambio 1 — Fondos: paginación de liquidaciones

### Qué cambia

- El query de liquidaciones pasa de `take: 10` fijo a `skip + take` con count previo, usando el param `page` ya existente en la URL.
- Se agregan controles ← anterior / siguiente → al pie de la tabla de liquidaciones, con el mismo markup y clases que los de transacciones.

### Params de URL

| Param | Tipo | Comportamiento |
|-------|------|---------------|
| `page` | entero ≥ 1 | Comparten el mismo param. Al hacer submit del form de búsqueda sin `page`, resetea a 1 automáticamente. |

### Lógica de datos

```ts
// Antes
prisma.liquidacion.findMany({ where: { idConductor }, orderBy: ..., take: 10 })

// Después
const [liqTotal, liquidaciones] = await Promise.all([
  prisma.liquidacion.count({ where: { idConductor } }),
  prisma.liquidacion.findMany({ where: { idConductor }, orderBy: ..., skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
])
```

---

## Cambio 2 — Transacciones: filtro por estado

### Qué cambia

- Se agrega un `<select>` en la `admin-cmd-bar` del form de transacciones, entre el input de userId y el botón CONSULTAR →.
- El valor seleccionado se envía como param `estado` en la URL.
- El WHERE de Prisma incluye `estado` si está presente.
- Los links de paginación (← anterior / siguiente →) preservan `&estado=...` en el href.

### Param de URL

| Param | Tipo | Valores válidos | Default |
|-------|------|----------------|---------|
| `estado` | string \| undefined | `PENDIENTE` `CONFIRMADO` `CANCELADO` | `undefined` → sin filtro |

### Lógica de datos

```ts
const whereEstado = estadoClean
  ? { OR: [...], estado: estadoClean as EstadoTransaccion }
  : { OR: [...] }

prisma.transaccion.count({ where: whereEstado })
prisma.transaccion.findMany({ where: whereEstado, ... })
```

### UI del select

Integrado en la barra existente, antes del botón:

```
[ ⌕  clerk user id... ]  [ Todos ▾ ]  [ CONSULTAR → ]
```

Opciones: Todos / PENDIENTE / CONFIRMADO / CANCELADO

---

## Lo que no cambia

- `PAGE_SIZE = 10` ya definido como constante, se reutiliza.
- Estructura de tabs, AdminNav, y resto de la página sin modificar.
- No se agregan filtros en debug ni en APIs — no hay caso de uso concreto.

---

## Archivos afectados

- `src/app/(protected)/admin/page.tsx` — único archivo a modificar
