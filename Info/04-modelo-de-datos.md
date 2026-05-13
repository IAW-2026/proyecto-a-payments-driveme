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
| `id` | UUID / String | Primary Key interna. |
| `nombre` | String | Nombre del conductor. |
| `apellido` | String | Apellido del conductor. |
| `estado` | ENUM | `OFFLINE`, `ONLINE`, `OCUPADO`. |
| `latitud_actual` | Decimal | Latitud de la última ubicación reportada. |
| `longitud_actual` | Decimal | Longitud de la última ubicación reportada. |
| `isActive` | Booleano | `TRUE`, `FALSE`.|

## Entidad: Vehículo

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `id_conductor` | UUID / String | Foreign Key referenciando a `Driver.id`. |
| `número_patente` | String | Único. Patente del vehículo. |
| `marca` | String | Marca. |
| `modelo` | String | Modelo. |
| `color` | String | Color del auto. |
| `año` | Integer | Año de fabricación. |
| `isActive` | Booleano | `TRUE`, `FALSE`.|

## Entidad: Viaje

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `id_solicitud` | String | ID de la solicitud original proveniente de la Rider App. |
| `id_conductor` | UUID / String | Foreign Key referenciando a `Driver.id`. |
| `estado_actual` | ENUM | `ACEPTADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO_POR_CONDUCTOR`. |
| `tiempo_aceptado` | Timestamp | Fecha y hora en que el conductor aceptó el viaje. |
| `tiempo_comienzo` | Timestamp | Fecha y hora en que el pasajero subió al vehículo. |
| `tiempo_completado` | Timestamp | Fecha y hora en que finalizó el recorrido. |
| `metodo_pago` | ENUM | `EFECTIVO`, `TARJETA`. Heredado de la solicitud inicial al aceptar el viaje. |
| `precio_final` | Decimal | Costo final a enviar a la Payments App para el cobro. |

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

<!-- Describir tablas y campos -->

## Entidad: Método de Pago

| Campo              | Tipo de Dato | Reglas / Descripción 
|------------------  |--------------|------------------------
| id                 | UUID/String  | Primary Key.
| id_usuario         | UUID/String  | FK al usuario (Pasajero) No contiene credenciales.
| tipo               | ENUM         | `TARJETA`, `EFECTIVO`, `...`
| token              | String       | Tokenizado por el gateway (identificador seguro del medio).
| gateway_provider   | String       | Nombre del proveedor
| fecha_creacion     | Timestamp    | Fecha de creación del método.

## Entidad: Tarjeta

| Campo                 | Tipo de Dato   | Reglas / Descripción 
|--------------------   |----------------|------------------------
| id_tarjeta            | UUID/String    | Primary Key (opcional si se usa `Método de Pago.id`).
| metodo_pago_id        | UUID/String    | FK a `Método de Pago.id`.
| numero_enmascarado    | String         | PAN enmascarado para UI/identificación.
| marca_tarjeta         | String         | `VISA`, `MASTERCARD`, etc.
| mes_vencimiento       | Integer        | 1-12.
| año_vencimiento       | Integer        | Año en 4 dígitos.
| nombre_titular        | String         | Nombre del dueño en la tarjeta.
| direccion_facturacion | UUID/String    | FK a tabla de direcciones (si aplica).
| fecha_agregado        | Timestamp      | Fecha en que se agregó la tarjeta.

## Entidad: Transacción

| Campo                  | Tipo de Dato | Reglas / Descripción 
|------------------      |----------------|------------------------
| id_transaccion         | UUID/String | Primary Key.
| id_metodo_pago         | UUID/String | FK a `Método de Pago.id`.
| id_viaje               | UUID/String | FK al `Viaje.id` (si aplica).
| monto                  | Decimal     | Monto cobrado.
| moneda                 | String      | ISO 4217 (p.ej. `USD`, `ARS`).
| estado                 | ENUM        | `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `CANCELED`.
| gateway_provider       | String      | Nombre del proveedor (Stripe, Adyen, etc.).
| gateway_transaction_id | String      | ID de la transacción en el gateway.
| detalle_gateway        | JSON        | Respuesta/errores completos del gateway (para auditoría).
| fecha_creacion         | Timestamp   | Fecha de la operación.
| fecha_actualizacion    | Timestamp   | Última actualización de estado.

## Entidad: Reembolso

| Campo             | Tipo de Dato| Reglas / Descripción 
|------------------ |-------------|------------------------
| id_reembolso      | UUID/String | Primary Key.
| id_transaccion    | UUID/String | FK a `Transacción.id_transaccion`.
| monto             | Decimal     | Monto a reembolsar (puede ser parcial).
| estado            | ENUM        | `PENDING`, `COMPLETED`, `FAILED`, `REVERSED`.
| razon             | String      | Motivo del reembolso.
| gateway_refund_id | String      | ID del reembolso en el gateway.
| fecha_solicitud   | Timestamp   | Fecha en que se solicitó el reembolso.
| fecha_actualizacion  | Timestamp   | Fecha en que se modifico por ultima vez

---

## Feedback App

### Entidades principales

<!-- Describir tablas y campos -->
- Entidad: Calificacion /*Lo hice de la forma unificada, depende de lo que me digan (si es unificada o separada) en la consulta debo modificarlo*/

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| id_calificacion | UUID | Primary Key. |
| id_viaje | UUID  | Identificador de viaje. |
| id_emisor | UUID  | Identificador del usuario que realiza la calificación. |
| id_receptor | UUID  | Identificador del usuario que recibe la calificación. |
| puntaje | Integer | Valor de 1 a 5. |
| comentario | String | Reseña opcional del usuario. |
| fecha | Timestamp | Fecha de creación de la calificación. |

- Entidad: Reporte

| Campo | Tipo de Dato | Reglas / Descripción |
| :--- | :--- | :--- |
| `id_reporte` | UUID  | Primary Key. |
| `id_calificacion` | UUID  | Identificador de calificacion.  |
| `id_reportante` | UUID  | Usuario que realiza el reporte. |
| `id_reportado` | UUID  | Usuario que recibe el reporte. |
| `motivo` | String | Descripción del motivo del reporte. |
| `estado` | ENUM | `PENDIENTE`, `APROBADO`, `RECHAZADO`. |
| `isActive` | Booleano | `TRUE`, `FALSE`.| /** es un "soft delete" de la BD, sirve para "eliminar" cosas que estan relacionadas con otras. Si yo elimino esto con un delete entonces deberia eliminar todo lo que este relacionado con esto. Con esta modificacion no hago esto, solo lo inhabilito y listo.**/



<!-->
---


<!-- Describir tablas y campos -->

---


## Datos duplicados y estrategia de consistencia

| Dato duplicado | Apps que lo tienen | Fuente de verdad | Estrategia |
|----------------|--------------------|-----------------|------------|
| Usuario (clerk_user_id) | Todas | Clerk | Cada app sincroniza al primer login vía webhook o lazy load |
| Viaje (id_viaje, id_solicitud, id_conductor, estado_actual) |	Rider y	Driver App | Driver App | La Driver App es el único "dueño" con permiso de escritura. Cualquier cambio genera un evento que la Rider App consume para actualizar su vista materializada de solo lectura. |
