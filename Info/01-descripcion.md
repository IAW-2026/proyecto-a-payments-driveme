# 1.1 — Descripción del Sistema

> **Tipo A — Plataforma de Transporte**

## ¿Qué problema resuelve?

<!-- Describir el problema que resuelve el sistema y el dominio de aplicación específico elegido por la comisión. Ejemplo: una plataforma de transporte para zonas rurales con poca cobertura, orientada a conectar conductores particulares con pasajeros frecuentes. -->

El sistema busca resolver la dificultad de acceder a transporte confiable y predecible en entornos urbanos, donde los usuarios necesitan trasladarse de forma eficiente en horarios recurrentes, como viajes al trabajo o estudio.
Si bien existen plataformas como Uber o Cabify, estas se enfocan principalmente en solicitudes bajo demanda inmediata, sin contemplar la necesidad de planificar viajes frecuentes con anticipación.
En este contexto, la aplicación propone mejorar la experiencia del usuario permitiendo definir rutas y horarios preestablecidos, reduciendo los tiempos de solicitud y brindando mayor previsibilidad tanto para pasajeros como para conductores.

## Actores del sistema

| Actor     | Descripción                                                                                                             | Apps donde interactúa  |
|-----------|-------------------------------------------------------------------------------------------------------------------------|------------------------|
| Conductor |Gestionara mediante la app de conductor los distintos viajes disponibles manteniendo sus rutas actuales o viajes activos.| Driver App,Feedback app|
|           |Tambien podra dejar una reseña del pasajero                                                                              |                        |
| Pasajero  |Utilizara la app para pedir viajes a ubicaciones que el mismo ingrese, ademas de gestionar la eleccion y/o realizacion   | Rider app, Payment app,|
|           |de pago al conductor que le acepte el viaje tambien podra dejar una reseña de su viaje                                   | Feedback app           |
| Moderador |Gestiona reportes y modera reseñas mediante la app de Feedback                                                           | Feedback app           | 


## Flujo principal de uso

<!-- Describir el flujo de punta a punta del caso de uso central del sistema. Ejemplo:

1. El pasajero solicita un viaje desde la **Rider App**.
2. La **Driver App** notifica a los conductores disponibles y uno acepta.
3. Al finalizar el viaje, la **Payments App** procesa el cobro al pasajero y la liquidación al conductor.
4. La **Feedback App** habilita la calificación mutua entre pasajero y conductor.
-->

1. Solicitud de viaje: El pasajero solicita un viaje en la Rider App.

2. Aceptacion de pedido: El conductor acepta el viaje a traves de la driver app.

3. Notificacion de aceptacion: Se detecta en la rider App la aceptacion por parte del conductor desde la driver app y se podra finalmente notificar al usuario que su viaje ha sido aceptado. Mientras esta en busqueda de conductor, el pasajero puede cancelar la solicitud; una vez aceptado/creado el viaje, la cancelacion pasa a ser solo del conductor (Driver App).

4. Ejecucion: El viaje sucede y al llegar al destino, el estado del viaje se actualiza siempre desde la Driver App (ownership del conductor). Si el pago es electronico, Payments confirma el cobro y Driver App realiza el cierre automatico; si el pago es en efectivo, el conductor marca la finalizacion manualmente.

5. Retroalimentacion: Una vez terminado el viaje le llegara, tanto a la rider app del pasajero como a la driver app del conductor, la opcion de calificar de forma breve, a traves de la Feedback App, (Con un sistema de estrellas) o extensa (con un sistema de reseña sumado a las estrellas) donde podran dar su opinion de la experiencia de usuario.

