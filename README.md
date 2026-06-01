[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/1wBeYWXT)

# Payments App — DriveMe

Microservicio de pagos del proyecto DriveMe (IAW 2026). Gestiona transacciones, billeteras de conductores, liquidaciones y la integración con Mercado Pago (modo sandbox).

**Deploy:https://proyecto-a-payments-driveme.vercel.app/ <--** 

---

### NOTA:

-Por cookies de tercero dado uso de Clerk y tambien no indexacion de pagina dado que usuario final es Admin Practicas recomendadas en todas las paginas es 77 y SEO 66

## Acceso

El usuario final es administador, nadie mas debe tener acceso a esta app ya que el proposito de la misma es servir
de un centro de aministracion en la cual el usuario final pueda tener acceso a la informacion privilegiada de los 
conductores y/o pasajeros para poder evaluar transacciones, funcionamiento de pagos, billeteras de conductores y 
liquidaciones a conductores lo que obviamente, no deberia ser accedido por un Rider o Driver

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

### DEBUG

- **URL:** `https://proyecto-a-payments-driveme.vercel.app/debug`
Solo pueden acceder los admin, es para poder testear de forma correcta, posee un NAV que te deja hacer seed, manejar roles, llamar endpoints para testear y probar los MOCKS de los get. Finalmente tambien cuenta con la opcion de cargar la seed de prueba desde test-seed.json lo cual agrega el seed base, ademas tenes otras opciones para eliminar el seed volverlo a cargar y podes manipular la base de datos a voluntad basicamente sin necesidad de entrar a Supabase, se realizo con la idea de que se pueda debugear todo de forma correcta sin tenes que "limpiar" la db luego de cada prueba manualmente. Su enfoque esta basado en una idea de QOL (Quality Of Life) para el Tester.
---

### MERCADO PAGO
Haciendo uso de los endpoints crear transaccion y procesar transaccion podremos empezar a utilizar mercado pago sandbox, al crear la transaccion con el endpoint "simulamos ser el rider" y automaticamente el id de la transaccion se pega en la casilla procesar transaccion, en la misma seleccionamos "Que somos" (Rider para mercado pago y Driver para efectivo) ya que 
el PUT se realiza por distinto actor (Driver/Rider) segun el metodo de pago y eso cambia la logica y al apretar el boton
se creara el init_point para pagar en Mercado Pago Sandbox, tener en cuenta para mercado pago que:

1-Todas las credenciales deben ser de prueba
2-Se recomienda fuertemente ingresar desde incognito a la app para evitar cualquier problema, loguear con un user de prueba y agregar tarjeta de prueba para realizar el pago y cambiando solo el nombre de titular probar todas las distintas posiblidades de estados o resultados del pago.


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

##