# 1.5 — Usuarios Compartidos

> **Tipo A — Plataforma de Transporte**

El sistema utiliza **Clerk** como servicio centralizado de autenticación. Los usuarios se autentican a través de Clerk independientemente de qué app estén usando, y la identidad se propaga entre servicios mediante el token JWT emitido por Clerk.

---

## ¿Qué apps comparten usuarios?

| Usuario                  | Apps donde puede autenticarse |
|--------------------------|-------------------------------|
| Pasajero (`rider`)       | Rider App, Payments App, Feedback App
| Conductor (`driver`)     | Driver App, Payments App, Feedback App 
| Moderador (`moderator`)  | Feedback App 

<!-- Definir claramente qué roles de usuario existen y en qué apps pueden autenticarse. Un mismo usuario de Clerk puede tener acceso a más de una app. -->

---

## Claims del JWT relevantes por app

| App          | Claims utilizados    | Para qué |
|--------------|----------------------|----------|
| Driver App   | `sub`, `role`, `exp` | Identificar conductor, autorizar acciones exclusivas de conductor, rechazar tokens vencidos 
| Rider App    | `sub`, `role`, `exp` | Identificar pasajero, autorizar acciones exclusivas de pasajero, rechazar tokens vencidos 
| Payments App | `sub`, `role`, `exp` | Asociar métodos de pago/transacciones al usuario autenticado y validar vigencia del token 
| Feedback App | `sub`, `role`, `exp` | Identificar emisor de calificación/reporte y validar permisos de moderación 

**Claims comunes acordados:**
- `sub`: identificador global de usuario compartido entre servicios.
- `role`: rol funcional del usuario (`rider`, `driver`, `moderator`).
- `exp`: expiración del token para validación de sesión.

<!-- Definir si los roles se gestionan como metadata en Clerk (publicMetadata) o de otra forma. -->

---

## Estrategia de roles

<!-- Describir cómo se define si un usuario es conductor, pasajero o administrador.
Opciones comunes:
- Metadata en Clerk: `publicMetadata.role = "driver" | "rider" | "admin"`
- Organización separada por tipo de usuario en Clerk
- Roles gestionados localmente en cada app
-->

La estrategia de roles se define de forma centralizada en Clerk mediante metadata pública:

- `publicMetadata.role = "rider" | "driver" | "moderator"`
- Cada app valida el JWT en cada request y autoriza por `role`.
- El `sub` de Clerk se usa como ID compartido entre microservicios para vincular datos de pasajero, conductor, pagos y feedback.
- Ninguna app reasigna roles localmente: cualquier cambio de rol se realiza en Clerk para mantener una única fuente de verdad.

---
## Reglas de autorización por endpoint

Las siguientes reglas resumen cómo se aplican los roles en los endpoints inter-servicio definidos en la etapa:

| App          | Endpoint                                       | Roles permitidos                   | Validación mínima |
|--------------|------------------------------------------------|------------------------------------|-------------------|
| Rider App    | `POST /api/viajes`                                            | `driver`                           | Token válido (`exp`) y `role=driver` 
| Driver App   | `GET /api/viajes/{id_viaje}/telemetria`        | `rider`                            | Token válido (`exp`), `role=rider`, pasajero dueño del viaje (`sub`) |
| Driver App   | `PATCH /api/viajes/{id_viaje}/estado`          | `driver`                           | Token válido (`exp`), `role=driver`, conductor dueño del viaje (`sub`) |
| Driver App   | `PATCH /api/viajes/{id_viaje}`                 | `driver`                           | Token válido (`exp`), `role=driver`, viaje en estado `ACEPTADO` o `EN_CURSO` |
| Rider App    | `POST /api/viajes/{id_viaje}/pago-confirmado`  | Servicio Payments (M2M)            | Token de servicio válido y relación con `id_viaje` |
| Rider App    | `PATCH /api/solicitudes/{id_solicitud}`        | `rider`                            | Token válido (`exp`), `role=rider`, solicitud propia (`sub`) y estado `BUSCANDO_CONDUCTOR` |
| Driver App   | `GET /api/viajes/{id_viaje}/estado`            | `feedback`/servicio Feedback (M2M) | Token de servicio válido e `id_viaje` existente 
| Driver App   | `POST /api/conductor/reputacion`               | Servicio Feedback (M2M)            | Token de servicio válido y `id_conductor` válido |
| Payments App | `POST /api/pagos/methods`                      | `rider`                            | Token válido (`exp`), `role=rider`, `sub=id_usuario` |
| Payments App | `POST /api/pagos/{id_transaccion}/refunds`     | `rider`                            | Token válido (`exp`), `role=rider`, transacción asociada al `sub` |
| Feedback App | `POST /api/resenas`                            | `rider`, `driver`                  | Token válido (`exp`) y participación del `sub` en `id_viaje` |

