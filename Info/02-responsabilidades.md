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
- SolicitudDeViaje(id_solicitud, id_pasajero, origen, destino, precio_estimado, estado). En estado de busqueda (sin conductor asignado), el pasajero puede cancelarla desde Rider App.
- Viaje (id_viaje, id_solicitud, id_conductor, estado_actual). Este dato en Rider es de lectura/visualización para el pasajero y no define transiciones de estado.

### Payments App
<!-- Entidades que viven en la base de datos de esta app -->
- Metodo de Pago (id, gateway_provider, tipo, token)
- Tarjeta (id_tarjeta, numero_enmascarado, marca_tarjeta, mes_vencimiento, año_vencimiento, nombre_titular, direccion_facturacion, fecha_creacion)
- Transacciones  (id_transaccion, monto, moneda, estado, gateway-provider, gateway_transaction_id, gateway_detail, fecha_realizada, fecha_actualizacion)
- Reembolso (id_reembolso, monto, estado, razon, gateway_refund_id, fecha_solicitud, fecha_actualizacion)

### Feedback App
<!-- Entidades que viven en la base de datos de esta app -->
- Calificacion (id_calificacion, id_viaje, id_emisor, id_receptor, puntaje, comentario, isActive) /isActive: TRUE, FALSE. es para poder deshabilitar calificaciones/
- Reporte (id_reporte, id_reportante, id_reportado, motivo, estado) /Estado: PENDING, APPROVED, REJECTED. id_calificacion para ver que calificacion reporto./

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

