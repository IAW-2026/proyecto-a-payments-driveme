# 1.2 — Asignación de Responsabilidades

> **Tipo A — Plataforma de Transporte**

## Distribución de webapps

| App | Responsable | Repositorio |
|-----|-------------|-------------|
| Driver App | Victoria Pellegrini | `proyecto-a-driver-[nombre]` |
| Rider App | Martina Andres | `proyecto-a-rider-[nombre]` |
| Payments App | Tomas Copelotti | `proyecto-a-payments-[nombre]` |
| Feedback App | Agostino Laurella | `proyecto-a-feedback-[nombre]` |
| Promotions App *(si son 5)* | | `proyecto-a-promotions-[nombre]` |

---

## Datos propios de cada app

### Driver App
<!-- Entidades que viven en la base de datos de esta app -->
- Conductor (nombre, apellido, estado, ubuicación_actual, calificacion_promedio) /*estado: (ONLINE/OFFLINE/OCUPADO)*/
- Vehículo (patente, marca, modelo, año de fabricación y color).
- Viaje (id_viaje, referencia a la solicitud del pasajero, costo final exacto, marcas de tiempo de inicio/fin y estado actual). La Driver App es dueña del ciclo de vida del viaje (inicio, en curso, finalizado) y de la cancelacion una vez aceptado el viaje.

### Rider App
<!-- Entidades que viven en la base de datos de esta app -->
- Pasajero (id_pasajero, nombre, email, teléfono, rating_promedio)
- DirecciónFrecuente: (id_dir, id_pasajero, nombreVivienda, coordenadas)
- SolicitudDeViaje(id_solicitud, id_pasajero, origen, destino, precio_estimado, estado). En estado de busqueda (sin conductor asignado), el pasajero puede cancelarla desde Rider App. Si el timer de búsqueda (2 minutos) vence sin que ningún conductor acepte, el frontend de Rider App dispara automáticamente un PATCH que transiciona la solicitud a `EXPIRADA_SIN_ACEPTACION`.
- Viaje (id_viaje, id_solicitud, id_conductor, estado_actual). Este dato en Rider es de lectura/visualización para el pasajero y no define transiciones de estado.

### Payments App
<!-- Entidades que viven en la base de datos de esta app -->
- Usuario (id, rol) /*id = Clerk user_id rol: RIDER | DRIVER | ADMIN*/
- Transaccion (id_transaccion, id_viaje, id_pasajero, id_conductor, metodo_pago, monto, estado, estado_liquidacion, gateway_provider, gateway_transaction_id, detalle_gateway, fecha_creacion, fecha_actualizacion) /*metodo_pago: EFECTIVO | MERCADO_PAGO. estado: PENDIENTE | CONFIRMADO | CANCELADO. estado_liquidacion: PENDIENTE | LIQUIDADO*/
- Billetera (id, id_conductor, monto_pendiente, monto_liquidado, fecha_creacion, fecha_actualizacion) /*una por conductor; monto_pendiente = fondos disponibles para liquidar (90% de viajes confirmados)*/
- Liquidacion (id_liquidacion, id_conductor, monto_pagado, estado, fecha_programada, fecha_ejecutada, detalle, fecha_creacion, fecha_actualizacion) /*estado: PENDIENTE | PROCESADA | FALLIDA. Se crea cada vez que un conductor cobra sus fondos acumulados*/
- BancoCentral (id, fondos_empresa, fondos_a_debitar, fondos_debitados_historico, fecha_actualizacion) /*singleton (id = "main"); fondos_empresa = 10% acumulado de cada viaje; fondos_a_debitar = 90% pendiente de pagar a conductores*/

### Feedback App
<!-- Entidades que viven en la base de datos de esta app -->
- Calificacion (id_calificacion, id_viaje, id_emisor, id_receptor, puntaje, comentario, fecha, isActive) /isActive: TRUE, FALSE. es para poder deshabilitar calificaciones/
- Reporte (id_reporte, id_calificacion, id_reportante, id_reportado, motivo, descripcion, estado, isActive) /Estado: PENDING, APPROVED, REJECTED. id_calificacion para ver qué calificación reportó./


<!-- Entidades que viven en la base de datos de esta app --> 

---

## Datos o acciones que requieren comunicación entre apps

| App origen    | Acción / dato necesario                                        | App destino | API involucrada                                 |
|---------------|----------------------------------------------------------------|-------------|-------------------------------------------------|
| Rider App     | Crear solicitud de viaje (origen, destino)                     | Rider App   | POST /api/solicitudes                           |
| Driver App    | Consultar solicitudes disponibles                              | Rider App   | GET /api/solicitudes?estado=BUSCANDO_CONDUCTOR  |
| Driver App    | Aceptar solicitud de viaje                                     | Rider App   | POST /api/viajes                                |
| Rider App     | Consultar viaje activo del pasajero                            | Rider App   | GET /api/pasajeros/{id_pasajero}/viajes/activos |
| Rider App     | Consultar telemetría del viaje                                 | Driver App  | GET /api/viajes/{id_viaje}/telemetria           |
| Driver App    | Actualizar estado del viaje (inicio/fin)                       | Driver App  | PATCH /api/viajes/{id_viaje}/estado             |
| Driver App    | Cancelar viaje ya aceptado (solo Conductor)                    | Driver App  | PATCH /api/viajes/{id_viaje}                    |
| Driver App    | Finalizar viaje y procesar pago                                | Payments App| POST /api/pagos/procesar                        |
| Rider App     | Enviar calificación del conductor                              | Feedback App| POST /api/resenas                               |
| Driver App    | Enviar calificación del pasajero                               | Feedback App| POST /api/resenas                               |
| Rider App     | Cancelar solicitud en búsqueda (solo Pasajero)                 | Rider App   | PATCH /api/solicitudes/{id_solicitud}           |
| Rider App     | Reportar calificación                                          | Feedback App| POST /api/reportes                              |
| Feedback App  | Obtener estado del viaje para validar calificación             | Driver App  | GET /api/viajes/{id_viaje}/estado               |
| Feedback App  | Actualizar reputación del conductor                            | Driver App  | POST /api/conductor/reputacion                  |
| Feedback App  | Actualizar reputación del pasajero                             | Rider App   | POST /api/pasajero/reputacion                   |    

