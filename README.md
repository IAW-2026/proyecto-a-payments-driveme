[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/1wBeYWXT)

# Payments App — DriveMe

Microservicio de pagos del proyecto DriveMe (IAW 2026). Gestiona transacciones, billeteras de conductores, liquidaciones y la integración con Mercado Pago (modo sandbox).

**Deploy:https://proyecto-a-payments-driveme.vercel.app/ <--** 

---

## Acceso

### Administrador

- **URL:** `https://proyecto-a-payments-driveme.vercel.app/admin`
- **Credenciales de demo:**
- **USER/PASSWORD:** TEACHERTEST/THISISATESTACCOUNT
- El panel de administración permite ver el estado del Banco Central, buscar billeteras de conductores y revisar el historial de transacciones con paginación.

### Usuarios de prueba (entorno de desarrollo)

Ejecutar **Reseed** desde `/debug` → pestaña *Reset* para cargar los datos base. Los siguientes IDs quedan disponibles:

| ID | Rol | Nombre |
|--------------------|--------|---------------|
| `user_dev_admin1`  | ADMIN  | Admin Dev     |
| `user_dev_driver1` | DRIVER | Carlos Gómez  |
| `user_dev_driver2` | DRIVER | Ana Martínez  |
| `user_dev_driver3` | DRIVER | Lucas Pérez   |
| `user_dev_rider1`  | RIDER  | María García  |
| `user_dev_rider2`  | RIDER  | Diego López   |

Para llamar a los endpoints API como un usuario de prueba, agregar el header:

```
x-dev-user-id: user_dev_driver1
```

---

## Stack

| Capa | Tecnología |
|---------------|-------------------------|
| Framework     | Next.js 15 (App Router) |
| Base de datos | PostgreSQL + Prisma v7  |
| Autenticación | Clerk                   |
| Pagos         | Mercado Pago (sandbox)  |
| Deploy        | Vercel + <Supabase DB>  |

---

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa. En desarrollo, copiar a `.env.local` y completar los valores.

---

## Datos precargados

El reseed carga automáticamente:

- 6 usuarios de prueba (1 admin, 3 conductores, 2 pasajeros)
- 8 transacciones en distintos estados (EFECTIVO y MERCADO_PAGO)
- 3 billeteras de conductores con saldos distintos
- 2 liquidaciones procesadas

---

## Endpoints principales

Estos endpoints están pensados para ser consumidos por las otras apps del proyecto:
_________________________________________________________________________________________________________
| Endpoint                   | Método | Caller             | Descripción                                |
|----------------------------|--------|--------------------|--------------------------------------------|
| `/api/pagos/transacciones` | POST   | Rider App          | Crea una transacción al confirmar un viaje |
| `/api/pagos/transacciones` | PUT    | Driver / Rider App | Procesa la transacción (EFECTIVO o MP)     |
| `/api/pagos/transacciones` | GET    | Driver / Rider App | Historial de transacciones del usuario     |
| `/api/pagos/liquidaciones` | POST   | Driver App         | Solicita liquidación de saldo pendiente    |
| `/api/pagos/liquidaciones` | GET    | Driver App         | Resumen de billetera y liquidaciones       |
| `/api/webhooks/mercadopago`| POST   | Mercado Pago       | Notificación de pago (IPN)                 |
|_______________________________________________________________________________________________________|