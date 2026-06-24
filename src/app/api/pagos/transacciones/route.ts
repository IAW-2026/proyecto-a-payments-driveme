import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { validateServiceToken } from "@/lib/service-auth";
import { validateAdmin, resolveCallerUser } from "@/lib/validators";
import type { Prisma } from "@/generated/prisma/client";

const CORTE = 0.10;
const NETO  = 0.90;

function notifyRider(id_solicitud: string, id_transaccion: string, estado_pago: "APROBADO" | "RECHAZADO", monto: number) {
  const riderUrl = process.env.RIDER_APP_URL;
  if (!riderUrl) return;
  fetch(`${riderUrl}/api/solicitudes/${id_solicitud}/pagos`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${process.env.PAYMENTS_SERVICE_SECRET ?? ""}`,
    },
    body: JSON.stringify({ id_solicitud, estado_pago, id_transaccion, monto }),
  }).catch(() => {});
}

// POST — two paths based on caller:
// DRIVER_SERVICE_SECRET (EFECTIVO): one-shot create + process, all fields required, returns CONFIRMADO
// RIDER_SERVICE_SECRET  (MERCADO_PAGO): create PENDIENTE only — id_viaje and id_conductor unknown yet
export async function POST(req: Request) {
  const isDriverService = validateServiceToken(req, "DRIVER_SERVICE_SECRET");
  const isRiderService  = validateServiceToken(req, "RIDER_SERVICE_SECRET");
  const adminCalling    = !isDriverService && !isRiderService ? await validateAdmin(req) : null;

  if (!isDriverService && !isRiderService && !adminCalling) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { metodo_pago } = body;

  // DRIVER path (or admin simulating EFECTIVO): create + process atomically
  const actingAsDriver = isDriverService || (adminCalling && metodo_pago === "EFECTIVO");
  if (actingAsDriver) {
    const { id_viaje, id_solicitud, id_pasajero, id_conductor, monto } = body;

    if (!id_viaje || !id_solicitud || !id_pasajero || !id_conductor || monto == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const monto_num = Number(monto);

    const transaccion = await prisma.$transaction(async (tx) => {
      const created = await tx.transaccion.create({
        data: {
          idViaje:           id_viaje,
          idSolicitud:       id_solicitud,
          idPasajero:        id_pasajero,
          idConductor:       id_conductor,
          metodoPago:        "EFECTIVO",
          monto:             monto_num,
          estado:            "CONFIRMADO",
          estadoLiquidacion: "PENDIENTE",
        },
      });

      await tx.billetera.upsert({
        where:  { idConductor: id_conductor },
        create: { idConductor: id_conductor, montoPendiente: monto_num * NETO },
        update: { montoPendiente: { increment: monto_num * NETO } },
      });

      await tx.bancoCentral.upsert({
        where:  { id: "main" },
        create: { id: "main", fondosADebitar: monto_num * NETO, fondosEmpresa: monto_num * CORTE },
        update: { fondosADebitar: { increment: monto_num * NETO }, fondosEmpresa: { increment: monto_num * CORTE } },
      });

      return created;
    });

    notifyRider(id_solicitud, transaccion.id, "APROBADO", monto_num);

    return NextResponse.json({ id_transaccion: transaccion.id, estado: "CONFIRMADO" }, { status: 201 });
  }

  // RIDER path (or admin simulating MP): create PENDIENTE, id_viaje/id_conductor filled later via PATCH
  const actingAsRider = isRiderService || adminCalling;
  if (actingAsRider) {
    const { id_pasajero, id_solicitud, monto } = body;

    if (!id_pasajero || !id_solicitud || monto == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (metodo_pago !== "MERCADO_PAGO") {
      return NextResponse.json(
        { error: "Rider-initiated transactions must use MERCADO_PAGO" },
        { status: 400 }
      );
    }

    const transaccion = await prisma.transaccion.create({
      data: {
        idPasajero:        id_pasajero,
        idSolicitud:       id_solicitud,
        metodoPago:        "MERCADO_PAGO",
        monto:             Number(monto),
        estado:            "PENDIENTE",
        estadoLiquidacion: "PENDIENTE",
      },
    });

    return NextResponse.json({ id_transaccion: transaccion.id, estado: "PENDIENTE" }, { status: 201 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// PUT — MERCADO_PAGO only (Rider App): generates MP preference
// id_solicitud is already stored at POST time; passing it here is accepted but not required
export async function PUT(req: Request) {
  const isRiderService = validateServiceToken(req, "RIDER_SERVICE_SECRET");
  const adminCalling   = !isRiderService ? await validateAdmin(req) : null;

  if (!isRiderService && !adminCalling) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id_transaccion } = body;

  if (!id_transaccion) {
    return NextResponse.json({ error: "Missing id_transaccion" }, { status: 400 });
  }

  const transaccion = await prisma.transaccion.findUnique({ where: { id: id_transaccion } });
  if (!transaccion) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (transaccion.metodoPago !== "MERCADO_PAGO") {
    return NextResponse.json({ error: "PUT is only for MERCADO_PAGO transactions" }, { status: 400 });
  }
  if (transaccion.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Transaction already processed" }, { status: 409 });
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ error: "MP_ACCESS_TOKEN not configured" }, { status: 503 });
  }

  try {
    const backBase = process.env.MP_BACK_URL_BASE ?? "";
    const pref = new Preference(mpClient);
    const prefResponse = await pref.create({
      body: {
        items: [{
          id:          transaccion.id,
          title:       "Viaje DriveMe",
          unit_price:  Number(transaccion.monto),
          quantity:    1,
          currency_id: "ARS",
        }],
        external_reference: transaccion.id,
        notification_url:   `${backBase}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${backBase}/pago/exito`,
          failure: `${backBase}/pago/falla`,
          pending: `${backBase}/pago/pendiente`,
        },
        auto_return: "approved",
      },
    });

    await prisma.transaccion.update({
      where: { id: id_transaccion },
      data: {
        gatewayProvider:      "mercadopago",
        gatewayTransactionId: prefResponse.id ?? null,
        detalleGateway: { preference_id: prefResponse.id, init_point: prefResponse.init_point },
      },
    });

    return NextResponse.json({
      id_transaccion,
      preference_id: prefResponse.id,
      init_point:    prefResponse.init_point,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Mercado Pago error", detail: err?.message ?? String(err) },
      { status: 502 }
    );
  }
}

// PATCH — MERCADO_PAGO post-trip (Driver App): enriches transaction with id_viaje + id_conductor
// and updates billetera/banco_central now that the conductor is known
export async function PATCH(req: Request) {
  const isDriverService = validateServiceToken(req, "DRIVER_SERVICE_SECRET");
  const adminCalling    = !isDriverService ? await validateAdmin(req) : null;

  if (!isDriverService && !adminCalling) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id_solicitud, id_viaje, id_conductor } = body;

  if (!id_solicitud || !id_viaje || !id_conductor) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const transaccion = await prisma.transaccion.findUnique({ where: { idSolicitud: id_solicitud } });
  if (!transaccion) {
    return NextResponse.json({ error: "Transaction not found for this solicitud" }, { status: 404 });
  }
  if (transaccion.metodoPago !== "MERCADO_PAGO") {
    return NextResponse.json({ error: "PATCH is only for MERCADO_PAGO transactions" }, { status: 400 });
  }
  if (transaccion.estado !== "CONFIRMADO") {
    return NextResponse.json({ error: "Transaction has not been confirmed yet" }, { status: 409 });
  }
  // Idempotency: already enriched
  if (transaccion.idViaje) {
    return NextResponse.json({ id_transaccion: transaccion.id, estado: transaccion.estado });
  }

  const monto = Number(transaccion.monto);

  await prisma.$transaction([
    prisma.transaccion.update({
      where: { id: transaccion.id },
      data:  { idViaje: id_viaje, idConductor: id_conductor },
    }),
    prisma.billetera.upsert({
      where:  { idConductor: id_conductor },
      create: { idConductor: id_conductor, montoPendiente: monto * NETO },
      update: { montoPendiente: { increment: monto * NETO } },
    }),
    prisma.bancoCentral.upsert({
      where:  { id: "main" },
      create: { id: "main", fondosADebitar: monto * NETO, fondosEmpresa: monto * CORTE },
      update: { fondosADebitar: { increment: monto * NETO }, fondosEmpresa: { increment: monto * CORTE } },
    }),
  ]);

  return NextResponse.json({ id_transaccion: transaccion.id, estado: transaccion.estado });
}

// GET — returns transaction history based on the caller's role
// Called by driver/rider apps forwarding the user's Clerk JWT
// Control Plane uses CONTROL_PLANE_SECRET service token — returns all transactions with optional filters
// RIDER response omits estadoLiquidacion (not relevant to passengers)
export async function GET(req: Request) {
  if (validateServiceToken(req, "CONTROL_PLANE_SECRET")) {
    const { searchParams } = new URL(req.url);
    const where: Prisma.TransaccionWhereInput = {};
    const estado            = searchParams.get("estado");
    const estadoLiquidacion = searchParams.get("estadoLiquidacion");
    const idConductor       = searchParams.get("idConductor");
    const idPasajero        = searchParams.get("idPasajero");
    if (estado)            where.estado            = estado as Prisma.TransaccionWhereInput["estado"];
    if (estadoLiquidacion) where.estadoLiquidacion = estadoLiquidacion as Prisma.TransaccionWhereInput["estadoLiquidacion"];
    if (idConductor)       where.idConductor       = idConductor;
    if (idPasajero)        where.idPasajero        = idPasajero;
    const transacciones = await prisma.transaccion.findMany({ where, orderBy: { fechaCreacion: "desc" } });
    return NextResponse.json(transacciones);
  }

  const caller = await resolveCallerUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  if (caller.rol === Rol.DRIVER) {
    const estadoLiquidacion = searchParams.get("estado_liquidacion");
    const where: Record<string, unknown> = { idConductor: caller.id };
    if (estadoLiquidacion === "PENDIENTE" || estadoLiquidacion === "LIQUIDADO") {
      where.estadoLiquidacion = estadoLiquidacion;
    }
    const transacciones = await prisma.transaccion.findMany({
      where,
      orderBy: { fechaCreacion: "desc" },
    });
    return NextResponse.json(transacciones);
  }

  if (caller.rol === Rol.RIDER) {
    const transacciones = await prisma.transaccion.findMany({
      where:   { idPasajero: caller.id },
      orderBy: { fechaCreacion: "desc" },
      omit:    { estadoLiquidacion: true },
    });
    return NextResponse.json(transacciones);
  }

  if (caller.rol === Rol.ADMIN) {
    const targetUserId = searchParams.get("userId");
    const rolFiltro    = searchParams.get("rol"); // "conductor" | "pasajero"

    if (!targetUserId) {
      return NextResponse.json({ error: "Admin must provide ?userId=" }, { status: 400 });
    }

    const where =
      rolFiltro === "conductor"
        ? { idConductor: targetUserId }
        : rolFiltro === "pasajero"
        ? { idPasajero: targetUserId }
        : { OR: [{ idConductor: targetUserId }, { idPasajero: targetUserId }] };

    const transacciones = await prisma.transaccion.findMany({
      where,
      orderBy: { fechaCreacion: "desc" },
    });
    return NextResponse.json(transacciones);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
