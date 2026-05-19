import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { validateServiceToken } from "@/lib/service-auth";

const CORTE = 0.10;
const NETO  = 0.90;

// POST — rider service creates the transaction when a trip is confirmed
export async function POST(req: Request) {
  if (!validateServiceToken(req, "RIDER_SERVICE_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id_viaje, id_pasajero, id_conductor, metodo_pago, monto } = body;

  if (!id_viaje || !id_pasajero || !id_conductor || monto == null || !metodo_pago) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (metodo_pago !== "EFECTIVO" && metodo_pago !== "MERCADO_PAGO") {
    return NextResponse.json({ error: "metodo_pago must be EFECTIVO or MERCADO_PAGO" }, { status: 400 });
  }

  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje:     id_viaje,
      idPasajero:  id_pasajero,
      idConductor: id_conductor,
      metodoPago:  metodo_pago,
      monto,
      estado:           "PENDIENTE",
      estadoLiquidacion: "PENDIENTE",
    },
  });

  return NextResponse.json({ id_transaccion: transaccion.id, estado: "PENDIENTE" }, { status: 201 });
}

// PUT — driver service (EFECTIVO) or rider service (MERCADO_PAGO) processes the transaction
export async function PUT(req: Request) {
  const isDriver = validateServiceToken(req, "DRIVER_SERVICE_SECRET");
  const isRider  = validateServiceToken(req, "RIDER_SERVICE_SECRET");

  if (!isDriver && !isRider) {
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
  if (transaccion.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Transaction already processed" }, { status: 409 });
  }

  // EFECTIVO — driver confirms trip end
  if (transaccion.metodoPago === "EFECTIVO") {
    if (!isDriver) {
      return NextResponse.json({ error: "Forbidden: EFECTIVO requires driver service token" }, { status: 403 });
    }

    const monto = Number(transaccion.monto);

    await prisma.$transaction([
      prisma.transaccion.update({
        where: { id: id_transaccion },
        data:  { estado: "CONFIRMADO" },
      }),
      prisma.billetera.upsert({
        where:  { idConductor: transaccion.idConductor },
        create: { idConductor: transaccion.idConductor, montoPendiente: monto * NETO },
        update: { montoPendiente: { increment: monto * NETO } },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: "main" },
        create: { id: "main", fondosADebitar: monto * NETO, fondosEmpresa: monto * CORTE },
        update: { fondosADebitar: { increment: monto * NETO }, fondosEmpresa: { increment: monto * CORTE } },
      }),
    ]);

    const riderUrl = process.env.RIDER_APP_URL;
    if (riderUrl) {
      fetch(`${riderUrl}/api/viajes/${transaccion.idViaje}/pago-confirmado`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id_transaccion, estado: "CAPTURED", monto }),
      }).catch(() => {});
    }

    return NextResponse.json({ id_transaccion, estado: "CONFIRMADO" });
  }

  // MERCADO_PAGO — rider initiates payment before trip starts
  if (transaccion.metodoPago === "MERCADO_PAGO") {
    if (!isRider) {
      return NextResponse.json({ error: "Forbidden: MERCADO_PAGO requires rider service token" }, { status: 403 });
    }
    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: "MP_ACCESS_TOKEN not configured" }, { status: 503 });
    }

    try {
      const backBase = process.env.MP_BACK_URL_BASE ?? "";
      const pref = new Preference(mpClient);
      const prefResponse = await pref.create({
        body: {
          items: [
            {
              id:          transaccion.idViaje,
              title:       "Viaje DriveMe",
              unit_price:  Number(transaccion.monto),
              quantity:    1,
              currency_id: "ARS",
            },
          ],
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

  return NextResponse.json({ error: "Unsupported metodo_pago" }, { status: 400 });
}

// GET — returns transaction history based on the caller's role
// Called by driver/rider apps forwarding the user's Clerk JWT
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await getUserRole(userId);
  if (!rol) return NextResponse.json({ error: "User not registered" }, { status: 403 });

  const { searchParams } = new URL(req.url);

  if (rol === Rol.DRIVER) {
    const estadoLiquidacion = searchParams.get("estado_liquidacion");
    const where: Record<string, unknown> = { idConductor: userId };
    if (estadoLiquidacion === "PENDIENTE" || estadoLiquidacion === "LIQUIDADO") {
      where.estadoLiquidacion = estadoLiquidacion;
    }
    const transacciones = await prisma.transaccion.findMany({
      where,
      orderBy: { fechaCreacion: "desc" },
    });
    return NextResponse.json(transacciones);
  }

  if (rol === Rol.RIDER) {
    const transacciones = await prisma.transaccion.findMany({
      where:   { idPasajero: userId },
      orderBy: { fechaCreacion: "desc" },
    });
    return NextResponse.json(transacciones);
  }

  if (rol === Rol.ADMIN) {
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
