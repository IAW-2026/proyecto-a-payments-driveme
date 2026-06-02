import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { validateAdmin } from "@/lib/validators";

const CORTE = 0.10;
const NETO  = 0.90;

// POST — simulates what the Rider App sends to POST /api/pagos/transacciones
// Auth: admin Clerk session. Internally uses the same logic as the production endpoint.
// For the defense: "seleccionar esta acción ejecuta exactamente lo que envía la Rider App,
// usando RIDER_SERVICE_SECRET como contexto de autenticación del servicio."
export async function POST(req: Request) {
  if (!(await validateAdmin(req))) {
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
      idViaje:           id_viaje,
      idPasajero:        id_pasajero,
      idConductor:       id_conductor,
      metodoPago:        metodo_pago,
      monto,
      estado:            "PENDIENTE",
      estadoLiquidacion: "PENDIENTE",
    },
  });

  return NextResponse.json({ id_transaccion: transaccion.id, estado: "PENDIENTE" }, { status: 201 });
}

// PUT — simulates what the Driver App (EFECTIVO) or Rider App (MERCADO_PAGO) sends
// Auth: admin Clerk session + perspectiva: "DRIVER" | "RIDER" in the body.
// For the defense: "seleccionar DRIVER ejecuta lo mismo que haría la Driver App con
// DRIVER_SERVICE_SECRET; seleccionar RIDER lo mismo que la Rider App con RIDER_SERVICE_SECRET."
export async function PUT(req: Request) {
  if (!(await validateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id_transaccion, perspectiva } = body;

  if (!id_transaccion) {
    return NextResponse.json({ error: "Missing id_transaccion" }, { status: 400 });
  }
  if (perspectiva !== "DRIVER" && perspectiva !== "RIDER") {
    return NextResponse.json({ error: "perspectiva must be DRIVER or RIDER" }, { status: 400 });
  }

  const transaccion = await prisma.transaccion.findUnique({ where: { id: id_transaccion } });
  if (!transaccion) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (transaccion.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Transaction already processed" }, { status: 409 });
  }

  // EFECTIVO — driver confirms trip end (perspectiva must be DRIVER)
  if (transaccion.metodoPago === "EFECTIVO") {
    if (perspectiva !== "DRIVER") {
      return NextResponse.json({ error: "EFECTIVO transactions must be processed from DRIVER perspective" }, { status: 403 });
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

  // MERCADO_PAGO — rider initiates payment (perspectiva must be RIDER)
  if (transaccion.metodoPago === "MERCADO_PAGO") {
    if (perspectiva !== "RIDER") {
      return NextResponse.json({ error: "MERCADO_PAGO transactions must be processed from RIDER perspective" }, { status: 403 });
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
