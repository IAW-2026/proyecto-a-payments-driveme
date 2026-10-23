# 1.3 — Diseño de APIs Inter-Servicios

> **Tipo A — Plataforma de Transporte**

Documentar cada endpoint que una app expone para ser consumido por otra app del sistema. Este contrato debe estar acordado por todos los integrantes antes de comenzar la Etapa 2.

## Estados canónicos acordados

Para evitar inconsistencias entre apps, se acuerda este set de estados:

- **SolicitudDeViaje (Rider App):** `BUSCANDO_CONDUCTOR`, `ACEPTADA`, `CANCELADA_POR_PASAJERO`, `EXPIRADA_SIN_ACEPTACION`.
- **Viaje (Driver App como owner):** `ACEPTADO`, `EN_CURSO`, `FINALIZADO`, `CANCELADO_POR_CONDUCTOR`.
- **Reporte (Feedback App):** `PENDIENTE`, `APROBADO`, `RECHAZADO`.

Nota: los estados de pasarela de pagos (`PENDING`, `CAPTURED`, `FAILED`, etc.) se mantienen en inglés porque provienen del gateway.

---

## Autenticación M2M (Machine-to-Machine)

Algunos endpoints requieren autenticación de servicio a servicio (M2M) en lugar de JWT de usuario. Estos son usados por apps para comunicarse entre sí de forma segura.

### Configuración en `.env` (todas las apps)

Cada servicio debe tener en su `.env`:
```
INTERNAL_API_KEY=<secreto_largo_seguro>
```

Opcional (dedicado para Feedback App):
```
FEEDBACK_APP_TOKEN=<secreto_largo_seguro>
```

Para generar un token seguro (32 caracteres hex):
```bash
openssl rand -hex 32
```

### Headers requeridos en requests M2M

Cuando una app llama a un endpoint que requiere M2M, debe incluir **una** de estas cabeceras:

**Opción 1 (recomendado - API Key):**
```
x-api-key: <INTERNAL_API_KEY>
```

**Opción 2 (Bearer Token):**
```
Authorization: Bearer <FEEDBACK_APP_TOKEN>
```

### Middleware de validación (lado servidor)

El servidor debe validar la cabecera recibida. Pseudocódigo:
```javascript
function requireM2MToken(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const expectedKey = process.env.INTERNAL_API_KEY;
  const expectedToken = process.env.FEEDBACK_APP_TOKEN;

  const isValid = 
    (apiKey && apiKey === expectedKey) ||
    (authHeader && authHeader === `Bearer ${expectedToken}`);

  if (!isValid) {
    return res.status(403).json({ error: 'Unauthorized M2M access' });
  }
  next();
}
```

### Endpoints que requieren M2M

Se marcarán como `[M2M]` en la especificación. Ejemplos:
- Driver App: `POST /api/conductor/reputacion` (llamada desde Feedback App)
- Rider App: `POST /api/pasajero/reputacion` (llamada desde Feedback App)
- Feedback App: `POST /api/resenas` (llamada desde Driver/Rider App)

---

## Driver App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Driver App pone a disposición de otras aplicaciones:

# A. Verificar estado del viaje para calificación
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Feedback App → Driver App)
* **Endpoint:** `GET /api/viajes/{id_viaje}/estado`
* **Autenticación:** Requerir header `x-api-key: <INTERNAL_API_KEY>` o `Authorization: Bearer <FEEDBACK_APP_TOKEN>`
* **Request:** No requiere cuerpo. El `id_viaje` se envía como parámetro en la URL.
* **Response:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "estado_actual": "FINALIZADO",
      "id_conductor": "cond_2pX...",
      "id_pasajero": "pas_9qL..."
    }
    ```
* **Quién llama a quién:** La Feedback App consume este endpoint de la Driver App para validar que el viaje realmente finalizó antes de permitir una reseña.

# B. Actualización de reputación
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Feedback App → Driver App)
* **Endpoint:** `POST /api/conductor/reputacion`
* **Autenticación:** Requerir header `x-api-key: <INTERNAL_API_KEY>` o `Authorization: Bearer <FEEDBACK_APP_TOKEN>`
* **Request:**
    ```json
    {
      "id_conductor": "cond_2pX...",
      "puntaje": 4.5,
      "comentario_promedio": "Conductor puntual y profesional."
    }
    ```
* **Nota:** `comentario_promedio` puede ser `null` si ninguna reseña recibida hasta el momento incluye comentario.
* **Response:** `200 OK`
* **Quién llama a quién:** La Feedback App consume este endpoint de la Driver App cada vez que un pasajero califica al conductor, para actualizar el puntaje promedio y el comentario promedio cacheados en la base de datos de conductores.

# C. Crear viaje (Conductor acepta solicitud)
* **Tipo:** User JWT (`driver`) + M2M sync después
* **Descripción:** Este endpoint materializa un viaje real cuando un conductor decide aceptar una solicitud que estaba en estado `BUSCANDO_CONDUCTOR`. Es el momento crítico donde la `SolicitudDeViaje` (en Rider App) transiciona a un `Viaje` (en Driver App). El conductor proporciona su ubicación actual y vehículo, y el sistema devuelve los datos completos del pasajero y puntos de encuentro.
* **Cuándo se invoca:** Cuando el conductor toca el botón "Aceptar viaje" en Driver App.
* **Qué cambia:** La solicitud en Rider App pasa de `BUSCANDO_CONDUCTOR` a `ACEPTADA`. En Driver App se crea un nuevo Viaje con estado `ACEPTADO`. El pasajero recibe notificación con datos del conductor y vehículo.
* **Endpoint:** `POST /api/viajes`
* **Autenticación:** Bearer token del conductor (JWT con `role=driver`)
* **Request:**
    ```json
    {
      "id_solicitud": "sol_abc123",
      "id_conductor": "cond_2pX...",
      "id_pasajero": "pas_9qL...",
      "id_vehiculo": "veh_abc123",
      "latitud_actual": -38.7183,
      "longitud_actual": -62.2664,
      "metodo_pago": "EFECTIVO",
      "precio_estimado": 4500.00
    }
    ```
* **Response:** Si tuvo éxito (201) el objeto viaje es creado con datos completos del pasajero, puntos exactos de origen/destino y datos de contacto. Si otro conductor ya aceptó la solicitud de viaje (409) se le informa al conductor por pantalla que la solicitud ya fue aceptada por otro conuctor.
* **Quién llama a quién:** La Driver App consume este endpoint de la Rider App para crear el viaje cuando el conductor acepta la solicitud. Tras éxito, Driver App debe llamar al endpoint A de Rider para sincronizar.

# D. Comunicación en Tiempo Real (Telemetría)
* **Endpoint:** `GET /api/viajes/{id_viaje}/telemetria`
* **Request:** No requiere cuerpo. El `id_viaje` se envía como parámetro en la URL.
* **Response:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "coordenadas": {
        "lat": -38.7190,
        "lng": -62.2670
      },
      "rumbo": 180,
      "velocidad_kmh": 45,
      "ultima_actualizacion": "2026-04-23T14:40:00Z"
    }
    ```
* **Quién llama a quién:** La Rider App consume este endpoint de la Driver App de manera repetitiva y constante (por ejemplo, cada 5 o 10 segundos) mientras el viaje está en estado `EN_CURSO` para mover el ícono del auto en el mapa del pasajero.

---

## Rider App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Rider App pone a disposición de otras aplicaciones.

Nota de ownership: la Rider App no marca inicio ni fin del viaje. El ciclo de vida del viaje (EN_CURSO/FINALIZADO) y su telemetria son responsabilidad de la Driver App. Rider solo consume estos datos para mostrarlos al pasajero. Adicionalmente, una vez aceptado el viaje, Rider App no puede cancelarlo.

# A. Crear viaje (Conductor acepta solicitud)
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Driver App → Rider App)
* **Descripción:** Endpoint de Rider App que actúa como receptor cuando Driver App invoca la creación de un viaje. Rider App persiste la información de viaje aceptado para que la UI del pasajero pueda mostrar estado, datos del conductor y vehículo en tiempo real. Este endpoint es de propiedad Rider pero Driver App es quien lo invoca (flujo cruzado).
* **Cuándo se invoca:** Inmediatamente después de que Driver App crea exitosamente el viaje (invoca al endpoint C de Driver App). Driver App luego llama a este endpoint de Rider para sincronizar.
* **Nota importante:** Aunque Rider App expone este endpoint, es Driver App quien controla cuándo y cómo se invoca. Rider App solo almacena y replica información de solo lectura.
* **Endpoint:** `POST /api/viajes`
* **Autenticación:** Requerir header `x-api-key: <INTERNAL_API_KEY>` o `Authorization: Bearer <FEEDBACK_APP_TOKEN>` (equivalente a DRIVER_APP_TOKEN)
* **Request:**
    ```json
    {
      "id_solicitud": "sol_abc123",
      "id_conductor": "cond_2pX...",
      "id_vehiculo": "veh_abc123",
      "latitud_actual": -38.7183,
      "longitud_actual": -62.2664
    }
    ```
* **Response:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_solicitud": "sol_abc123",
      "estado_actual": "ACEPTADO",
      "precio_estimado": 2550.00,
      "metodo_pago": "TARJETA",
      "pasajero": {
        "id_pasajero": "pas_9qL..."
      },
      "origen": {
        "direccion": "Av. Alem 123",
        "latitud": -38.7191,
        "longitud": -62.2652
      },
      "destino": {
        "direccion": "Zapiola 456",
        "latitud": -38.7021,
        "longitud": -62.2801
      }
    }
    ```
* **Nota de privacidad:** No devolver `pasajero.nombre` u otros PII en respuestas M2M; usar solo para almacenamiento interno en Rider.
* **Quién llama a quién:** La Driver App consume este endpoint de la Rider App después de aceptar una solicitud para sincronizar el viaje en la base de datos del pasajero.

# B. Consultar estado de solicitud/viaje del pasajero
* **Endpoint:** `GET /api/pasajeros/{id_pasajero}/viajes/activos`
* **Request:** No requiere cuerpo. El `id_pasajero` se envía como parámetro en la URL.
* **Response:**
    ```json
    {
      "id_pasajero": "pas_9qL...",
      "viaje_activo": {
        "id_viaje": "uuid-12345",
        "id_solicitud": "sol_abc123",
        "estado_actual": "EN_CURSO",
        "id_conductor": "cond_2pX..."
      }
    }
    ```
* **Quién llama a quién:** La Driver App y/o la propia Rider UI pueden consumir este endpoint para resolver el viaje activo de un pasajero y luego consultar estado/telemetria en Driver App.


# C. Actualización de reputación del Pasajero (Webhook)
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Feedback App → Rider App)
* **Endpoint:** `POST /api/pasajero/reputacion`
* **Autenticación:** Requerir header `x-api-key: <INTERNAL_API_KEY>` o `Authorization: Bearer <FEEDBACK_APP_TOKEN>`
* **Request:**
    ```json
    {
      "id_pasajero": "pas_9qL...",
      "puntaje": 4.8,
      "comentario_promedio": "Pasajero puntual y respetuoso."
    }
    ```
* **Nota:** `comentario_promedio` puede ser `null` si ninguna reseña recibida hasta el momento incluye comentario.
* **Response:** `200 OK`
* **Quién llama a quién:** La Feedback App consume este endpoint de la Rider App cada vez que un conductor califica al pasajero, para actualizar el puntaje promedio y el comentario promedio cacheados en la base de datos de pasajeros.


# D. Notificación de cambio de estado para el pasajero (interno Rider)
* **Endpoint:** `POST /api/notificaciones/viajes/{id_viaje}/estado`
* **Request:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_pasajero": "pas_9qL...",
      "estado_actual": "EN_CURSO" | "FINALIZADO",
      "fuente": "DRIVER_APP"
    }
    ```
* **Response:** `200 OK`
* **Quién llama a quién:** La Rider App expone este endpoint para su propio backend o capa de notificaciones. No delega ownership del viaje: solo replica al pasajero un estado decidido por Driver App.


# E. Confirmación de pago (Webhook)
* **Endpoint:** `POST /api/viajes/{id_viaje}/pago-confirmado`
* **Request:**
    ```json
    {
      "id_transaccion": "tx_98765",
      "estado": "CAPTURED" | "FAILED",
      "monto": 2550.00
    }
    ```
* **Response:** `200 OK`
* **Quién llama a quién:** La Payments App consume este endpoint de la Rider App para notificar al pasajero el resultado del cobro. El cierre operativo del viaje sigue siendo responsabilidad de Driver App.

# F. Cancelar solicitud en búsqueda (solo Pasajero)
* **Descripción:** Permite que el pasajero desista de una solicitud que aún no tiene conductor asignado (estado `BUSCANDO_CONDUCTOR`). Una vez que un conductor acepta y se crea el Viaje, esta operación es bloqueada (retorna `409 Conflict`) porque la cancelación pasa a ser responsabilidad del conductor en Driver App. Es el derecho del pasajero de cambiar de opinión antes de comprometerse con un viaje.
* **Cuándo se invoca:** Mientras la solicitud está buscando conductor (pantalla de espera en Rider App). Si toca "Desistir" o expira el tiempo de búsqueda.
* **Qué cambia:** La solicitud pasa de `BUSCANDO_CONDUCTOR` a `CANCELADA_POR_PASAJERO`. Si hay un conductor cercano que ya estaba considerando la solicitud, recibe notificación de que fue cancelada.
* **Endpoint:** `PATCH /api/solicitudes/{id_solicitud}`
* **Precondición:** La solicitud debe estar en estado `BUSCANDO_CONDUCTOR` (sin conductor asignado). Si ya hay un Viaje creado, retorna error.
* **Request:**
    ```json
    {
      "id_pasajero": "pas_9qL...",
      "estado": "CANCELADA_POR_PASAJERO" | "EXPIRADA_SIN_ACEPTACION",
      "motivo": "DESISTIO" | "TIEMPO_EXCEDIDO" | "ERROR_ORIGEN_DESTINO"
    }
    ```
* **Nota:** cuando `estado` es `EXPIRADA_SIN_ACEPTACION`, el request lo genera automáticamente el frontend de Rider App al vencer el timer de búsqueda (2 minutos), no el usuario.
* **Response:**
    ```json
    {
      "id_solicitud": "sol_abc123",
      "estado": "CANCELADA_POR_PASAJERO"
    }
    ```
* **Quién llama a quién:** La Rider App permite que el pasajero cancele solicitudes sin aceptar. Si el viaje ya fue aceptado, la cancelación es responsabilidad de Driver App (solo conductor).

# G. Consultar solicitudes disponibles
* **Descripción:** Endpoint que expone la Rider App para que conductores autenticados obtengan solicitudes de viaje en estado `BUSCANDO_CONDUCTOR` dentro de un área determinada. Devuelve resultados paginados y metadatos. No expone información personal del pasajero.
* **Cuándo se invoca:** Cuando la Driver App necesita mostrar al conductor las solicitudes disponibles (lista o mapa) en su área.
* **Qué cambia:** Ninguno — operación de solo lectura en Rider App.
* **Endpoint:** `GET /api/solicitudes`
* **Request:** No requiere cuerpo. Parámetros de query recomendados:
    ```text
    estado=BUSCANDO_CONDUCTOR
    limit=20
    offset=0
    latitud=-38.7191
    longitud=-62.2652
    radius=2000
    orden=distancia
    ```
* **Response:** `200 OK` con objeto paginado. Ejemplo:
    ```json
    {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "solicitudes": [
        {
          "id_solicitud": "sol_abc123",
          "id_pasajero": "pas_9qL...",
          "origen": { "direccion": "Av. Alem 123", "latitud": -38.7191, "longitud": -62.2652 },
          "destino": { "direccion": "Zapiola 456", "latitud": -38.7021, "longitud": -62.2801 },
          "precio_estimado": 2550.00,
          "metodo_pago": "TARJETA",
          "created_at": "2026-05-17T12:00:00Z",
          "distance_m": 1200,
          "eta_min": 4
        }
      ]
    }
    ```
* **Quién llama a quién:** La Driver App consume este endpoint de la Rider App para mostrar a los conductores las solicitudes disponibles en su área.


---

## Payments App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Payments App pone a disposición de otras aplicaciones. La autenticación M2M se realiza con `Authorization: Bearer <SECRET>` usando el secret correspondiente al servicio que llama (`DRIVER_SERVICE_SECRET` o `RIDER_SERVICE_SECRET`). Los endpoints de usuario aceptan el JWT de Clerk del usuario autenticado.

---

# A. Crear transacción
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Rider App → Payments App)
* **Descripción:** Registra una nueva transacción cuando se confirma un viaje. La transacción queda en estado `PENDIENTE` hasta que se procese el pago. No mueve fondos todavía.
* **Endpoint:** `POST /api/pagos/transacciones`
* **Autenticación:** `Authorization: Bearer <RIDER_SERVICE_SECRET>`
* **Request:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_pasajero": "user_2abc...",
      "id_conductor": "user_2xyz...",
      "metodo_pago": "EFECTIVO",
      "monto": 2550.00
    }
    ```
* **Nota:** `metodo_pago` acepta `"EFECTIVO"` o `"MERCADO_PAGO"`.
* **Response:**
    ```json
    {
      "id_transaccion": "uuid-transaccion",
      "estado": "PENDIENTE"
    }
    ```
* **Quién llama a quién:** La Rider App consume este endpoint de la Payments App al confirmar un viaje, para registrar la transacción antes de que el conductor la procese.

# B. Procesar transacción
* **Tipo:** `[M2M]` Llamada servicio-a-servicio (Driver App o Rider App → Payments App)
* **Descripción:** Confirma o inicia el cobro de una transacción existente. El flujo varía según el método de pago: EFECTIVO lo resuelve el conductor al finalizar el viaje; MERCADO_PAGO lo inicia el pasajero generando una preferencia de pago.
* **Cuándo se invoca:** Driver App lo llama al marcar un viaje como finalizado (EFECTIVO). Rider App lo llama cuando el pasajero inicia el pago (MERCADO_PAGO).
* **Qué cambia:**
  * EFECTIVO: la transacción pasa a `CONFIRMADO`, la billetera del conductor recibe el 90% del monto y el Banco Central acumula el 10%. Luego se notifica a la Rider App vía `POST /api/viajes/{id_viaje}/pago-confirmado`.
  * MERCADO_PAGO: la transacción permanece en `PENDIENTE` hasta que MP confirme el pago por webhook. Se devuelve el `init_point` para redirigir al pasajero.
* **Endpoint:** `PUT /api/pagos/transacciones`
* **Autenticación:** `Authorization: Bearer <DRIVER_SERVICE_SECRET>` (EFECTIVO) o `Authorization: Bearer <RIDER_SERVICE_SECRET>` (MERCADO_PAGO)
* **Request:**
    ```json
    {
      "id_transaccion": "uuid-transaccion"
    }
    ```
* **Response EFECTIVO:**
    ```json
    {
      "id_transaccion": "uuid-transaccion",
      "estado": "CONFIRMADO"
    }
    ```
* **Response MERCADO_PAGO:**
    ```json
    {
      "id_transaccion": "uuid-transaccion",
      "preference_id": "pref_xxx",
      "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
    }
    ```
* **Quién llama a quién:** La Driver App consume este endpoint al finalizar el viaje (EFECTIVO). La Rider App lo consume cuando el pasajero decide pagar con Mercado Pago.

# C. Consultar historial de transacciones
* **Descripción:** Devuelve el historial de transacciones del usuario autenticado. La respuesta varía según el rol: el conductor ve el estado de liquidación de cada transacción; el pasajero no.
* **Endpoint:** `GET /api/pagos/transacciones`
* **Autenticación:** Bearer token JWT del usuario (Clerk). El rol se resuelve desde la base de datos.
* **Request:** No requiere cuerpo. Query params opcionales para conductores: `?estado_liquidacion=PENDIENTE|LIQUIDADO`
* **Response (conductor):**
    ```json
    [
      {
        "id": "uuid-transaccion",
        "idViaje": "uuid-12345",
        "monto": "2550.00",
        "metodoPago": "EFECTIVO",
        "estado": "CONFIRMADO",
        "estadoLiquidacion": "PENDIENTE",
        "fechaCreacion": "2026-05-28T00:00:00.000Z"
      }
    ]
    ```
* **Response (pasajero):** igual pero sin el campo `estadoLiquidacion`.
* **Quién llama a quién:** La Driver App y la Rider App consumen este endpoint para mostrar al usuario su historial de pagos.

# D. Solicitar liquidación
* **Descripción:** El conductor solicita el cobro de todos sus viajes confirmados con liquidación pendiente. Crea un registro de `Liquidacion`, actualiza la billetera del conductor y sincroniza el Banco Central. La operación es atómica: ocurre todo o nada.
* **Endpoint:** `POST /api/pagos/liquidaciones`
* **Autenticación:** Bearer token JWT del conductor (Clerk, rol `DRIVER`).
* **Request:** No requiere cuerpo. El conductor se identifica por su JWT.
* **Response:**
    ```json
    {
      "id_liquidacion": "uuid-liquidacion",
      "monto_pagado": 2295.00,
      "estado": "PROCESADA"
    }
    ```
* **Nota:** `monto_pagado` es la suma del 90% de cada transacción confirmada pendiente. Devuelve `422` si no hay transacciones pendientes a liquidar.
* **Quién llama a quién:** La Driver App consume este endpoint cuando el conductor solicita cobrar sus ganancias acumuladas.

# E. Consultar billetera e historial de liquidaciones
* **Descripción:** Devuelve el saldo actual de la billetera del conductor y el historial de sus liquidaciones.
* **Endpoint:** `GET /api/pagos/liquidaciones`
* **Autenticación:** Bearer token JWT del conductor (Clerk, rol `DRIVER`).
* **Request:** No requiere cuerpo.
* **Response:**
    ```json
    {
      "montoPendiente": 2295.00,
      "montoLiquidado": 4950.00,
      "liquidaciones": [
        {
          "id": "uuid-liquidacion",
          "montoPagado": 4950.00,
          "estado": "PROCESADA",
          "fechaEjecutada": "2026-05-28T00:00:00.000Z"
        }
      ]
    }
    ```
* **Quién llama a quién:** La Driver App consume este endpoint para mostrar al conductor su billetera y el historial de pagos recibidos.

# F. Webhook de Mercado Pago
* **Descripción:** Receptor de notificaciones de Mercado Pago. Cuando un pago MERCADO_PAGO cambia de estado, MP envía este evento. Si el pago fue aprobado, confirma la transacción, actualiza billetera y Banco Central, y notifica a la Rider App. Es idempotente: si la transacción ya fue procesada, ignora el evento sin error.
* **Endpoint:** `POST /api/webhooks/mercadopago`
* **Autenticación:** Sin header de auth (MP envía el evento). La validez se verifica consultando el estado del pago directamente a la API de MP con el `payment_id` recibido.
* **Request (enviado por Mercado Pago):**
    ```json
    {
      "type": "payment",
      "data": { "id": "mp_payment_id_123" }
    }
    ```
* **Response:** `200 { "ok": true }` siempre (para que MP no reintente).
* **Quién llama a quién:** Mercado Pago llama a este endpoint de la Payments App cada vez que el estado de un pago cambia. Payments App luego notifica a la Rider App si el pago fue aprobado.

# G. Webhook de Clerk
* **Descripción:** Receptor de eventos de Clerk. Al registrarse un nuevo usuario, Clerk envía este evento. Payments App crea el usuario en su base de datos con rol `DRIVER` y actualiza los metadatos públicos del JWT en Clerk para que los otros servicios puedan leer el rol.
* **Endpoint:** `POST /api/webhooks/clerk`
* **Autenticación:** Verificación de firma Svix (headers `svix-id`, `svix-timestamp`, `svix-signature` + `CLERK_WEBHOOK_SECRET`). Rechaza con `400` si la firma no coincide.
* **Request (enviado por Clerk):**
    ```json
    {
      "type": "user.created",
      "data": { "id": "user_2abc..." }
    }
    ```
* **Response:** `200 { "ok": true }`
* **Quién llama a quién:** Clerk llama automáticamente a este endpoint cuando un usuario completa el registro. No requiere acción de ninguna otra app.

---

## Feedback App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Feedback App pone a disposición de otras aplicaciones:

# A. Registro de reseña (por Conductor)

* **Tipo:** User JWT (`driver`)
* **Endpoint:** `POST /api/resenas`
* **Autenticación:** Bearer token del conductor (JWT con `role=driver`)
* **Request:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_emisor": "cond_2pX...",
      "id_receptor": "pas_9qL...",
      "puntaje": 5,
      "comentario": "Pasajero puntual y respetuoso."
    }
    ```
* **Response:** 
    ```json
    {
      "id_calificacion": "cal_xyz789",
      "estado": "REGISTRADA",
      "timestamp": "2026-04-22T20:15:30Z"
    }
    ```
* **Quién llama a quién:** La Driver App consume este endpoint de la Feedback App para enviar la valoración del conductor hacia el pasajero después de finalizar un viaje.

# B. Registro de reseña (por Pasajero)

* **Tipo:** User JWT (`rider`)
* **Endpoint:** `POST /api/resenas`
* **Autenticación:** Bearer token del pasajero (JWT con `role=rider`)
* **Request:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_emisor": "pas_9qL...",
      "id_receptor": "cond_2pX...",
      "puntaje": 4,
      "comentario": "Buen viaje, conductor profesional."
    }
    ```
* **Response:** 
    ```json
    {
      "id_calificacion": "cal_abc456",
      "estado": "REGISTRADA",
      "timestamp": "2026-04-22T20:16:45Z"
    }
    ```
* **Quién llama a quién:** La Rider App consume este endpoint de la Feedback App para enviar la valoración del pasajero hacia el conductor después de finalizar un viaje.

# C. Crear reporte sobre una calificación

* **Endpoint:** `POST /api/reportes`
* **Request:**
    ```json
    {
      "id_reportante": "pas_9qL...",
      "id_calificacion": "cal_xyz789",
      "motivo": "COMENTARIO_INAPROPIADO",
      "descripcion": "Lenguaje ofensivo en el comentario de la calificación"
    }
    ```
* **Response:** 
    ```json
    {
      "id_reporte": "rep_m1n2o3...",
      "estado": "PENDIENTE",
      "timestamp": "2026-04-22T20:30:15Z"
    }
    ```
* **Quién llama a quién:** La Driver App o Rider App consumen este endpoint de la Feedback App para reportar una calificación inapropiada que requiere revisión.

# D. Consultar calificaciones de un usuario

* **Endpoint:** `GET /api/usuarios/{id_usuario}/calificaciones`
* **Request:** No requiere cuerpo. El `id_usuario` se envía como parámetro en la URL.
* **Response:**
    ```json
    {
      "id_usuario": "cond_2pX...",
      "calificacion_promedio": 4.7,
      "total_calificaciones": 42,
      "detalles": [
        {
          "id_calificacion": "cal_xyz789",
          "id_viaje": "uuid-12345",
          "puntaje": 5,
          "comentario": "Pasajero puntual y respetuoso.",
          "id_emisor": "pas_9qL...",
          "timestamp": "2026-04-22T20:15:30Z"
        }
      ]
    }
    ```
* **Quién llama a quién:** La Driver App o Rider App consumen este endpoint de la Feedback App para obtener el historial de calificaciones de un usuario específico.


---


<!-- Documentar los endpoints que expone esta app -->
<!-- Agregar secciones por cada integración adicional identificada -->
