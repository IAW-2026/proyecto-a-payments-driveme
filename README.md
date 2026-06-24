[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/1wBeYWXT)

# Payments App — DriveMe

**Deploy:** https://proyecto-a-payments-driveme.vercel.app/

---

## Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin+clerk_test@iaw.com` | `iawuser#` | verfication code: 424242

> El acceso a esta app es exclusivo para administradores. Los roles rider y driver son consumidos vía API por las otras apps del ecosistema; no tienen panel propio aquí.

---

## Instrucciones de evaluación

1. Ingresar a https://proyecto-a-payments-driveme.vercel.app/ y loguearse con el usuario administrador.
2. Ir a `/debug` → pestaña **Reset** → botón **Reseed** para cargar los datos de prueba (20 transacciones, 3 billeteras, 4 liquidaciones).
3. Evaluar el panel `/admin`:
   - **Usuarios**: lista todos los usuarios del sistema con links directos a su billetera o historial.
   - **Fondos**: ver el estado del Banco Central. Buscar billetera de conductor ingresando `user_dev_driver1`, `user_dev_driver2` o `user_dev_driver3`.
   - **Transacciones**: buscar historial por usuario (o usar el link desde el tab Usuarios), filtrar por estado con los chips debajo del buscador.
4. Para probar el flujo completo de pagos, usar la pestaña **Endpoints** en `/debug`:
   - Crear una transacción (POST) y luego procesarla (PUT) eligiendo el método de pago.
   - Para Mercado Pago: seleccionar perspectiva *Rider*, copiar el `init_point` devuelto y completar el pago en sandbox desde una ventana de incógnito con tarjetas de prueba de MP.
5. CUENTAS MERCADO PAGO  Y TARJETA
BUYER ACCOUNT: USER ID: 3409462069  USUARIO: TESTUSER8369637529059801235 CONTRA:WxORoy64HP Codigo verificacion:462069
ALLOWED CARDS: 
MASTERCARD NUMERO:5031 7557 3453 0604 CVV:123 FECHA_CADUCIDAD:11/30
VISA NUMERO:4509 9535 6623 3704 CVV:123 FECHA_CADUCIDAD:11/30
AMERCIAN EXPRESS NUMERO:3711 803032 57522 CVV:1234 FECHA_CADUCIDAD:11/30
MASTERCARD DEBITO NUMERO:5287 3383 1025 3304 CVV:123 FECHA_CADUCIDAD:11/30
VISA DEBITO NUMERO:4002 7686 9439 5619 CVV:123 FECHA_CADUCIDAD:11/30
Estado de pago	Descripción	Documento de identidad
APRO
Pago aprobado
(DNI) 12345678
OTHE
Rechazado por error general
(DNI) 12345678
CONT
Pendiente de pago
-
CALL
Rechazado con validación para autorizar
-
FUND
Rechazado por importe insuficiente
-
SECU
Rechazado por código de seguridad inválido
-
EXPI
Rechazado debido a un problema de fecha de vencimiento
-
FORM
Rechazado debido a un error de formulario

---

## Descripción

Payments App es el microservicio de pagos de DriveMe, plataforma de transporte desarrollada para IAW 2026. Gestiona el ciclo de vida completo de los pagos: desde la creación de la transacción al confirmar un viaje hasta la liquidación del saldo acumulado del conductor.

Los pagos se procesan en dos modalidades: efectivo (confirmación directa por el driver) y Mercado Pago sandbox (flujo asincrónico vía webhook). El sistema aplica una comisión del 10% por viaje y mantiene un registro de billeteras individuales por conductor y un Banco Central que centraliza los fondos pendientes y el histórico de liquidaciones.

La app es de uso exclusivo del equipo administrativo. Las otras apps del ecosistema (Rider App y Driver App) se integran vía endpoints autenticados con service tokens y JWTs de Clerk.

---

## Notas para la corrección

- **Panel debug** (`/debug`): permite hacer reseed, manipular roles, llamar todos los endpoints y simular respuestas GET con mocks, sin necesidad de acceder directamente a Supabase. Está diseñado para evaluar todo el flujo sin limpiar la base de datos manualmente entre pruebas.
- **Datos precargados** (tras Reseed): 6 usuarios ficticios, 20 transacciones en todos los estados posibles — ninguna MERCADO_PAGO queda en PENDIENTE, ya que deben ser resueltas por el webhook de MP antes de considerarse válidas. 3 billeteras de conductores con saldos diferenciados, 4 liquidaciones procesadas.
- **Mercado Pago**: todas las credenciales son de prueba (sandbox). Se recomienda ingresar desde ventana de incógnito, loguearse con una cuenta de prueba de MP y usar las tarjetas de prueba oficiales para probar los distintos resultados (aprobado, rechazado, pendiente, ...).
- **Scores de Lighthouse**: Accessibility 77, SEO 66. La baja puntuación de SEO se da porque la app tiene `robots: noindex` porque es un panel interno que no debe ser indexado. Las cookies de terceros de Clerk también afectan el score de Performance.


