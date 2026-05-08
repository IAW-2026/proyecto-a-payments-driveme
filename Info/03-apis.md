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

## Driver App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Driver App pone a disposición de otras aplicaciones:

# A. Verificar estado del viaje para calificación
* **Endpoint:** `GET /api/viajes/{id_viaje}/estado`
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
* **Endpoint:** `POST /api/conductor/reputacion`
* **Request:**
    ```json
    {
      "id_conductor": "cond_2pX...",
      "puntaje": 5
    }
    ```
* **Response:** `200 OK`
* **Quién llama a quién:** La Feedback App consume este endpoint de la Driver App cada vez que un pasajero califica al conductor, permitiendo actualizar el promedio cacheado en la base de datos de conductores.

# C. Crear viaje (Conductor acepta solicitud)
* **Descripción:** Este endpoint materializa un viaje real cuando un conductor decide aceptar una solicitud que estaba en estado `BUSCANDO_CONDUCTOR`. Es el momento crítico donde la `SolicitudDeViaje` (en Rider App) transiciona a un `Viaje` (en Driver App). El conductor proporciona su ubicación actual y vehículo, y el sistema devuelve los datos completos del pasajero y puntos de encuentro.
* **Cuándo se invoca:** Cuando el conductor toca el botón "Aceptar viaje" en Driver App.
* **Qué cambia:** La solicitud en Rider App pasa de `BUSCANDO_CONDUCTOR` a `ACEPTADA`. En Driver App se crea un nuevo Viaje con estado `ACEPTADO`. El pasajero recibe notificación con datos del conductor y vehículo.
* **Endpoint:** `POST /api/viajes`
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
* **Response:** Objeto viaje creado con datos completos del pasajero, puntos exactos de origen/destino y datos de contacto.
* **Quién llama a quién:** La Driver App consume este endpoint de la Rider App para crear el viaje cuando el conductor acepta la solicitud.

# D. Registro de reseña del pasajero
* **Endpoint:** `POST /api/resenas`
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
* **Response:** `201 Created`
* **Quién llama a quién:** La Driver App consume este endpoint de la Feedback App para enviar la valoración del conductor hacia el pasajero.

# E. Comunicación en Tiempo Real (Telemetría)
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
* **Descripción:** Endpoint de Rider App que actúa como receptor cuando Driver App invoca la creación de un viaje. Rider App persiste la información de viaje aceptado para que la UI del pasajero pueda mostrar estado, datos del conductor y vehículo en tiempo real. Este endpoint es de propiedad Rider pero Driver App es quien lo invoca (flujo cruzado).
* **Cuándo se invoca:** Inmediatamente después de que Driver App crea exitosamente el viaje (invoca al endpoint C de Driver App). Driver App luego llama a este endpoint de Rider para sincronizar.
* **Nota importante:** Aunque Rider App expone este endpoint, es Driver App quien controla cuándo y cómo se invoca. Rider App solo almacena y replica información de solo lectura.
* **Endpoint:** `POST /api/viajes`
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
      "estado_actual": "ACEPTADO",
      "pasajero": {
        "id_pasajero": "pas_9qL...",
        "nombre": "Juan Perez"
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


# C. Notificación de cambio de estado para el pasajero (interno Rider)
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


# D. Confirmación de pago (Webhook)
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

# E. Cancelar solicitud en búsqueda (solo Pasajero)
* **Descripción:** Permite que el pasajero desista de una solicitud que aún no tiene conductor asignado (estado `BUSCANDO_CONDUCTOR`). Una vez que un conductor acepta y se crea el Viaje, esta operación es bloqueada (retorna `409 Conflict`) porque la cancelación pasa a ser responsabilidad del conductor en Driver App. Es el derecho del pasajero de cambiar de opinión antes de comprometerse con un viaje.
* **Cuándo se invoca:** Mientras la solicitud está buscando conductor (pantalla de espera en Rider App). Si toca "Desistir" o expira el tiempo de búsqueda.
* **Qué cambia:** La solicitud pasa de `BUSCANDO_CONDUCTOR` a `CANCELADA_POR_PASAJERO`. Si hay un conductor cercano que ya estaba considerando la solicitud, recibe notificación de que fue cancelada.
* **Endpoint:** `PATCH /api/solicitudes/{id_solicitud}`
* **Precondición:** La solicitud debe estar en estado `BUSCANDO_CONDUCTOR` (sin conductor asignado). Si ya hay un Viaje creado, retorna error.
* **Request:**
    ```json
    {
      "id_pasajero": "pas_9qL...",
      "estado": "CANCELADA_POR_PASAJERO",
      "motivo": "DESISTIO" | "TIEMPO_EXCEDIDO" | "ERROR_ORIGEN_DESTINO"
    }
    ```
* **Response:**
    ```json
    {
      "id_solicitud": "sol_abc123",
      "estado": "CANCELADA_POR_PASAJERO"
    }
    ```
* **Quién llama a quién:** La Rider App permite que el pasajero cancele solicitudes sin aceptar. Si el viaje ya fue aceptado, la cancelación es responsabilidad de Driver App (solo conductor).


---

## Payments App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

---
# A. Agregar metodo de pago
* **Endpoint:** `POST /api/pagos/methods`
* **Request:**
    ```json
    {
      "id_usuario": "pas_9qL...",
      "cvv": "tok_xxx",            
      "marca_tarjeta": "VISA",
      "numero_tarjeta": "4242",
      "mes_vencimiento": 12,
      "año_vencimiento": 2027,
      "direccion_facturacion":"Av Santa Fe..."
    }
* **Response:** `201 Added`
* **Quién llama a quién:** La Rider App consume este endpoint de la Payments App para poder agregar el método de pago.

# B. Solicitar reembolso
* **Endpoint:** `POST /api/pagos/{id_transaccion}/refunds`
* **Request:**
    ```json
    {
      "monto": 100.00,               
      "razon": "Usuario pidió devolución...",
      "id_pasajero": "pas_9qL..."
    }
* **Response:**
    ```json
      {
        "id_reembolso": "r_123456", 
        "id_transaccion": "tx_98765",
        "estado": "PENDING"
      }
* **Quién llama a quién:** La Rider App consume este endpoint de la Payments App para poder pedir un reembolso.

# C. Procesamiento de cobro al finalizar
* **Endpoint:** `POST /api/pagos/procesar`
* **Request:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "id_pasajero": "pas_9qL...",
      "monto": 2550.00,
      "tipo": "EFECTIVO" | "TARJETA"
    }
    ```
* **Response:**
    ```json
    {
      "id_transaccion": "tx_98765",
      "estado": "CAPTURED" | "PENDING"
    }
    ```
* **Quién llama a quién:** La Driver App consume este endpoint de la Payments App al momento de marcar el viaje como terminado.

---

## Feedback App — Endpoints expuestos

<!-- Documentar los endpoints que expone esta app -->

Todas las comunicaciones se realizan en formato JSON. Estos son los servicios que la Feedback App pone a disposición de otras aplicaciones:

# A. Registro de reseña (por Conductor)

* **Endpoint:** `POST /api/resenas`
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

* **Endpoint:** `POST /api/resenas`
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

# C. Actualización de reputación del Conductor (Webhook)

* **Endpoint:** `POST /api/conductor/reputacion`
* **Request:**
    ```json
    {
      "id_conductor": "cond_2pX...",
      "puntaje": 4.5
    }
    ```
* **Response:** `200 OK`
* **Quién llama a quién:** La Feedback App consume este endpoint de la Driver App cada vez que un pasajero califica al conductor, permitiendo actualizar el promedio cacheado en la base de datos de conductores.

# D. Actualización de reputación de Pasajero (Webhook)

* **Endpoint:** `POST /api/pasajero/reputacion`
* **Request:**
    ```json
    {
      "id_pasajero": "pas_9qL...",
      "puntaje": 4.8
    }
    ```
* **Response:** `200 OK`
* **Quién llama a quién:** La Feedback App consume este endpoint de la Rider App cada vez que un conductor califica al pasajero, permitiendo actualizar el promedio cacheado en la base de datos de pasajeros.

# E. Verificar estado del viaje para calificación

* **Endpoint:** `GET /api/viajes/{id_viaje}/estado`
* **Request:** No requiere cuerpo. El `id_viaje` se envía como parámetro en la URL.
* **Response:**
    ```json
    {
      "id_viaje": "uuid-12345",
      "estado_actual": "FINALIZADO",
      "id_conductor": "cond_2pX...",
      "id_pasajero": "pas_9qL...",
      "tiempo_completado": "2026-04-22T20:10:00Z"
    }
    ```
* **Quién llama a quién:** La Feedback App consume este endpoint de la Driver App para validar que el viaje realmente finalizó antes de permitir una reseña.

# F. Crear reporte sobre una calificación

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

# G. Consultar calificaciones de un usuario

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

# H. Listar reportes pendientes (para Moderador)

* **Endpoint:** `GET /api/reportes?estado=PENDIENTE`
* **Request:** No requiere cuerpo. Se pueden pasar parámetros de query para filtrar por estado.
* **Response:**
    ```json
    {
      "total": 5,
      "reportes": [
        {
          "id_reporte": "rep_m1n2o3...",
          "id_calificacion": "cal_xyz789",
          "id_reportante": "pas_9qL...",
          "motivo": "COMENTARIO_INAPROPIADO",
          "descripcion": "Lenguaje ofensivo en el comentario de la calificación",
          "estado": "PENDIENTE",
          "timestamp": "2026-04-22T20:30:15Z"
        }
      ]
    }
    ```
* **Quién llama a quién:** La Feedback App expone este endpoint para que los moderadores consulten reportes pendientes de revisión.

# I. Resolver reporte (aprobar o rechazar)

* **Endpoint:** `PATCH /api/reportes/{id_reporte}/resolver`
* **Request:**
    ```json
    {
      "estado": "APROBADO",
      "id_moderador": "mod_abc...",
      "accion": "ELIMINAR_CALIFICACION",
      "notas": "Calificación contiene lenguaje inapropiado"
    }
    ```
* **Response:** 
    ```json
    {
      "id_reporte": "rep_m1n2o3...",
      "estado": "APROBADO",
      "timestamp_resolucion": "2026-04-22T21:00:00Z",
      "calificacion_eliminada": "cal_xyz789"
    }
    ```
* **Quién llama a quién:** La Feedback App expone este endpoint para que los moderadores resuelvan reportes y tomen acciones (eliminar calificación, avisar a usuario, etc.).

---


<!-- Documentar los endpoints que expone esta app -->
<!-- Agregar secciones por cada integración adicional identificada -->
