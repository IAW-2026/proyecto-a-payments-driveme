# 1.4 — Modelo de Datos por Aplicación

> **Tipo A — Plataforma de Transporte**

Para cada webapp, describir las entidades principales de su base de datos: tablas, campos relevantes y relaciones. No es necesario un DER formal, pero sí que quede claro qué persiste cada app.

También identificar posibles duplicados entre apps (ej: usuarios) y definir cómo se resuelven las inconsistencias.

---

## Driver App

### Entidades principales

<!-- Describir tablas y campos -->
## Entidad: Conductor

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_conductor` | UUID / String | Primary Key interna (Clerk User ID). |
| `nombre` | String | Nombre del conductor. |
| `apellido` | String | Apellido del conductor. |
| `licencia` | String | Único. Número de licencia del conductor. |
| `fecha_alta` | Timestamp | Fecha de registro del conductor. Default: ahora. |
| `fecha_baja` | Timestamp | Fecha de baja del conductor (opcional). |
| `estado` | ENUM | `OFFLINE`, `ONLINE`, `OCUPADO`. |
| `meta_diaria` | Integer | Meta de ganancias diarias configurada por el conductor. Default 30000. |
| `latitud_actual` | Float | Latitud de la última ubicación reportada (opcional). |
| `longitud_actual` | Float | Longitud de la última ubicación reportada (opcional). |
| `calificacion_promedio` | Float | Valor cacheado desde la Feedback App. Default 5.0. |
| `isActive` | Booleano | `TRUE`, `FALSE`. Default `TRUE`.|

## Entidad: Historial de Conexión

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_conexion` | UUID / String | Primary Key. Generado automáticamente. |
| `id_conductor` | UUID / String | Foreign Key referenciando a `Conductor.id_conductor`. |
| `estado` | String | Tipo de evento registrado (`ONLINE` u `OFFLINE`). |
| `timestamp` | Timestamp | Fecha y hora exacta en la que en el conductor se puso online. Default: ahora. |

## Entidad: Vehículo

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_vehiculo` | UUID / String | Primary Key. |
| `id_conductor` | UUID / String | Foreign Key referenciando a `Conductor.id_conductor`. |
| `patente` | String | Único. Patente del vehículo. |
| `marca` | String | Marca. |
| `modelo` | String | Modelo. |
| `color` | String | Color del auto. Default "No especificado". |
| `anio` | Integer | Año de fabricación. |
| `fecha_baja` | Timestamp | Fecha de baja del vehículo (opcional). |
| `isActive` | Booleano | `TRUE`, `FALSE`. Default `TRUE`.|

## Entidad: Viaje

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_viaje` | UUID / String | Primary Key. |
| `estado` | String | Estado original del viaje (texto, no enum). Default "ACEPTADO". |
| `precio` | Float | Costo inicial del viaje. |
| `id_conductor` | UUID / String | Foreign Key referenciando a `Conductor.id_conductor`. |
| `id_vehiculo` | UUID / String | Foreign Key referenciando a `Vehiculo.id_vehiculo`. |
| `creado_en` | Timestamp | Fecha y hora de creación del registro. Default: ahora. |
| `id_solicitud` | String | ID de la solicitud original proveniente de la Rider App (opcional, único). |
| `id_pasajero` | String | Cacheado de la solicitud para no depender síncronamente de la Rider App (opcional). |
| `estado_actual` | ENUM | `ACEPTADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO_POR_CONDUCTOR`. Default `ACEPTADO`. |
| `tiempo_aceptado` | Timestamp | Fecha y hora en que el conductor aceptó el viaje. Default: ahora. |
| `tiempo_comienzo` | Timestamp | Fecha y hora en que el pasajero subió al vehículo (opcional). |
| `tiempo_completado` | Timestamp | Fecha y hora en que finalizó el recorrido (opcional). |
| `metodo_pago` | ENUM | `EFECTIVO`, `TARJETA`. Heredado de la solicitud inicial al aceptar el viaje. Default `EFECTIVO`. |
| `precio_final` | Float | Costo final a enviar a la Payments App para el cobro. Default 0. |
| `origen_direccion` | String | Dirección de origen persistida (opcional). |
| `origen_latitud` | Float | Latitud de origen persistida (opcional). |
| `origen_longitud` | Float | Longitud de origen persistida (opcional). |
| `destino_direccion` | String | Dirección de destino persistida (opcional). |
| `destino_latitud` | Float | Latitud de destino persistida (opcional). |
| `destino_longitud` | Float | Longitud de destino persistida (opcional). |
| `pasajero_nombre` | String | Nombre del pasajero cacheado (opcional). |

---

## Rider App

### Entidades principales

<!-- Describir tablas y campos -->

## Entidad: Pasajero

| Campo             | Tipo de Dato | Reglas / Descripción 
|-------------------|--------------|------------------------
| id                | UUID/String  | Primary Key. Identificador único global
| nombre            | String       | Nombre completo del usuario
| email             | String       | Único. Validado para comunicaciones y log in
| teléfono          | String       | Utilizado para la coordinación con el conductor
| rating_promedio   | Decimal      | Valor calculado/cacheado proveniente de la Feedback App.

## Entidad: Dirección Frecuente

| Campo            | Tipo de Dato   | Reglas / Descripción 
|------------------|----------------|------------------------
| id_dir           | UUID           | Primary Key
| id_pasajero      | UUID           | Llave foránea vinculada a Pasajero.id_pasajero
| nombreVivienda   | String         | Etiqueta personalizada (casa, trabajo)
| coordenadas      | Point/LatLng   | (interno) Necesario para que la app sepa a dónde ir

## Entidad: Solicitud de Viaje

| Campo            | Tipo de Dato   | Reglas / Descripción 
|------------------|----------------|------------------------
| id_solicitud     | UUID           | Primary Key
| id_pasajero      | UUID           | Llave foránea referenciando a Pasajero.id_pasajero
| origen           | Point/Text     | Punto de partida del viaje solicitado
| destino          | Point/Text     | Punto de llegada del viaje solicitado
| precio_estimado  | Decimal        | Tarifa sugerida antes de iniciar el servicio
| metodo_pago | ENUM | EFECTIVO, TARJETA.|
| estado           | ENUM           | BUSCANDO_CONDUCTOR, ACEPTADA, CANCELADA_POR_PASAJERO, EXPIRADA_SIN_ACEPTACION

## Entidad: Viaje

| Campo            | Tipo de Dato   | Reglas / Descripción 
|------------------|----------------|------------------------
| id_viaje         | UUID           | Primary Key. Debe coincidir con el ID en la Driver app
| id_solicitud     | UUID           | Llave foránea (1:1) referenciando a la solicitud origen
| id_conductor     | UUID           | Punto de partida del viaje solicitado
| estado_actual    | ENUM           | ACEPTADO, EN_CURSO, FINALIZADO, CANCELADO_POR_CONDUCTOR


## Payments App

### Entidades principales

## Entidad: Usuario

Espejo local del usuario de Clerk. Se crea al primer login y sirve de ancla para las relaciones internas.

| Campo          | Tipo de Dato | Reglas / Descripción                                      |
|----------------|--------------|-----------------------------------------------------------|
| `id`           | String       | Primary Key. Coincide con el `sub` de Clerk.             |
| `rol`          | ENUM         | `RIDER`, `DRIVER`, `ADMIN`. Default `RIDER`.             |
| `fecha_creacion` | Timestamp  | Fecha de creación del registro. Default: ahora.          |

## Entidad: Transaccion

Registra cada cobro realizado al finalizar un viaje. El método de pago es un campo directo (no una tabla separada): `EFECTIVO` se resuelve de forma síncrona y `MERCADO_PAGO` de forma asíncrona vía webhook.

| Campo                   | Tipo de Dato | Reglas / Descripción                                                               |
|-------------------------|--------------|------------------------------------------------------------------------------------|
| `id`                    | UUID/String  | Primary Key. Generado automáticamente.                                            |
| `id_viaje`              | String       | Único. FK lógica al `Viaje.id` en la Driver App.                                  |
| `id_pasajero`           | String       | Clerk User ID del pasajero. Sin FK rígida a `Usuario`.                            |
| `id_conductor`          | String       | Clerk User ID del conductor. Sin FK rígida a `Usuario`.                           |
| `metodo_pago`           | ENUM         | `EFECTIVO`, `MERCADO_PAGO`.                                                        |
| `monto`                 | Decimal(12,2)| Monto cobrado.                                                                     |
| `estado`                | ENUM         | `PENDIENTE`, `CONFIRMADO`, `CANCELADO`. Default `PENDIENTE`.                      |
| `estado_liquidacion`    | ENUM         | `PENDIENTE`, `LIQUIDADO`. Default `PENDIENTE`. Indica si ya fue incluida en una liquidación al conductor. |
| `gateway_provider`      | String?      | Nombre del proveedor (p.ej. `MERCADO_PAGO`). Nulo para EFECTIVO.                 |
| `gateway_transaction_id`| String?      | ID de la operación en el gateway. Nulo para EFECTIVO.                             |
| `detalle_gateway`       | JSON?        | Respuesta completa del gateway para auditoría.                                    |
| `fecha_creacion`        | Timestamp    | Fecha de la operación. Default: ahora.                                            |
| `fecha_actualizacion`   | Timestamp    | Última actualización de estado. Auto-actualizado.                                 |

## Entidad: Billetera

Saldo acumulado del conductor en la plataforma. Se actualiza cada vez que una `Transaccion` pasa a `CONFIRMADO`.

| Campo               | Tipo de Dato  | Reglas / Descripción                                                  |
|---------------------|---------------|-----------------------------------------------------------------------|
| `id`                | UUID/String   | Primary Key.                                                          |
| `id_conductor`      | String        | Único. Clerk User ID del conductor dueño de la billetera.            |
| `monto_pendiente`   | Decimal(12,2) | Fondos confirmados aún no liquidados. Default `0`.                   |
| `monto_liquidado`   | Decimal(12,2) | Total histórico transferido al conductor. Default `0`.               |
| `fecha_creacion`    | Timestamp     | Fecha de creación. Default: ahora.                                   |
| `fecha_actualizacion` | Timestamp   | Última actualización. Auto-actualizado.                              |

## Entidad: Liquidacion

Representa una transferencia programada de fondos desde la plataforma hacia un conductor.

| Campo               | Tipo de Dato  | Reglas / Descripción                                                  |
|---------------------|---------------|-----------------------------------------------------------------------|
| `id`                | UUID/String   | Primary Key.                                                          |
| `id_conductor`      | String        | Clerk User ID del conductor beneficiario.                            |
| `monto_pagado`      | Decimal(12,2) | Monto total de esta liquidación.                                     |
| `estado`            | ENUM          | `PENDIENTE`, `PROCESADA`, `FALLIDA`. Default `PENDIENTE`.            |
| `fecha_programada`  | Timestamp     | Fecha en que debe ejecutarse la transferencia.                       |
| `fecha_ejecutada`   | Timestamp?    | Fecha en que se ejecutó efectivamente (opcional).                    |
| `detalle`           | JSON?         | Metadatos o respuesta del procesador de pagos.                       |
| `fecha_creacion`    | Timestamp     | Default: ahora.                                                       |
| `fecha_actualizacion` | Timestamp   | Auto-actualizado.                                                     |

## Entidad: BancoCentral

Registro único (singleton, `id = "main"`) que lleva la contabilidad interna de los fondos de la empresa.

| Campo                      | Tipo de Dato  | Reglas / Descripción                                                      |
|----------------------------|---------------|---------------------------------------------------------------------------|
| `id`                       | String        | Primary Key. Valor fijo `"main"` — solo existe una fila.                 |
| `fondos_empresa`           | Decimal(12,2) | Saldo disponible de la empresa (comisiones cobradas). Default `0`.       |
| `fondos_a_debitar`         | Decimal(12,2) | Total pendiente de liquidar a conductores. Default `0`.                  |
| `fondos_debitados_historico` | Decimal(12,2)| Acumulado histórico de liquidaciones ejecutadas. Default `0`.           |
| `fecha_actualizacion`      | Timestamp     | Auto-actualizado en cada operación contable.                             |

---

## Feedback App

### Entidades principales

<!-- Describir tablas y campos -->
- Entidad: Calificacion 

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| id_calificacion | UUID | Primary Key. |
| id_viaje | UUID  | Identificador de viaje. |
| id_emisor | UUID  | Identificador del usuario que realiza la calificación. |
| id_receptor | UUID  | Identificador del usuario que recibe la calificación. |
| puntaje | Integer | Valor de 1 a 5. |
| comentario | String | Reseña opcional del usuario. |
| fecha | Timestamp | Fecha de creación de la calificación. |
| isActive | Booleano | `TRUE`, `FALSE`. Permite deshabilitar o inhabilitar calificaciones. |

- Entidad: Reporte

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_reporte` | UUID  | Primary Key. |
| `id_calificacion` | UUID  | Identificador de calificacion. |
| `id_reportante` | UUID  | Usuario que realiza el reporte. |
| `id_reportado` | UUID  | Usuario que recibe el reporte. |
| `motivo` | String | Descripción del motivo del reporte. |
| `descripcion` | String | Texto libre con más detalle del reporte. |
| `estado` | ENUM | `PENDIENTE`, `APROBADO`, `RECHAZADO`. |
| `fecha` | Timestamp | Fecha de creación/modificacion del reporte. |
| `isActive` | Booleano | `TRUE`, `FALSE`. Permite deshabilitar o inhabilitar reportes. |


<!-->
---


<!-- Describir tablas y campos -->

---


## Datos duplicados y estrategia de consistencia

| Dato duplicado | Apps que lo tienen | Fuente de verdad | Estrategia |
|----------------|--------------------|-----------------|------------|
| Usuario (clerk_user_id) | Todas | Clerk | Cada app sincroniza al primer login vía webhook o lazy load |
| Viaje (id_viaje, id_solicitud, id_conductor, estado_actual) |	Rider y	Driver App | Driver App | La Driver App es el único "dueño" con permiso de escritura. Cualquier cambio genera un evento que la Rider App consume para actualizar su vista materializada de solo lectura. |
