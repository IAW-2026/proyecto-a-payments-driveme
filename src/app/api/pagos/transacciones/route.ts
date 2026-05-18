import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { auth } from "@/lib/auth";
import { ensureUser, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";

const CORTE = 0.10;
const NETO  = 0.90;

async function registrarEnBilletera(idConductor: string, monto: number, esEfectivo: boolean) {
  const neto  = monto * NETO;
  const corte = monto * CORTE;
  await prisma.billetera.upsert({
    where:  { idConductor },
    create: {
      idConductor,
      montoSemanaActual:      neto,
      montoEfectivoPendiente: esEfectivo ? corte : 0,
    },
    update: {
      montoSemanaActual:      { increment: neto },
      ...(esEfectivo && { montoEfectivoPendiente: { increment: corte } }),
    },
  });
}

async function registrarEnBanco(monto: number) {
  const neto  = monto * NETO;
  const corte = monto * CORTE;
  await prisma.bancoCentral.upsert({
    where:  { id: "main" },
    create: { id: "main", fondosADebitar: neto, fondosEmpresa: corte },
    update: { fondosADebitar: { increment: neto }, fondosEmpresa: { increment: corte } },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await ensureUser(userId, Rol.DRIVER);
  if (rol !== Rol.DRIVER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id_viaje, id_pasajero, monto, metodo_pago } = body;

  if (!id_viaje || !id_pasajero || monto == null || !metodo_pago) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (metodo_pago !== "EFECTIVO" && metodo_pago !== "MERCADO_PAGO") {
    return NextResponse.json({ error: "metodo_pago must be EFECTIVO or MERCADO_PAGO" }, { status: 400 });
  }

  // --- MERCADO_PAGO: async Checkout Pro flow ---
  if (metodo_pago === "MERCADO_PAGO") {
    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: "MP_ACCESS_TOKEN not configured" }, { status: 503 });
    }

    const transaccion = await prisma.transaccion.create({
      data: {
        idViaje:         id_viaje,
        idPasajero:      id_pasajero,
        idConductor:     userId,
        metodoPago:      "MERCADO_PAGO",
        monto,
        estado:          "PENDIENTE",
        gatewayProvider: "mercadopago",
      },
    });

    try {
      const backBase = process.env.MP_BACK_URL_BASE ?? "";
      const pref = new Preference(mpClient);
      const prefResponse = await pref.create({
        body: {
          items: [
            {
              id:          id_viaje,
              title:       "Viaje DriveMe",
              unit_price:  Number(monto),
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
        where: { id: transaccion.id },
        data: {
          gatewayTransactionId: prefResponse.id ?? null,
          detalleGateway: { preference_id: prefResponse.id, init_point: prefResponse.init_point },
        },
      });

      return NextResponse.json(
        { id_transaccion: transaccion.id, preference_id: prefResponse.id, init_point: prefResponse.init_point, estado: "PENDING" },
        { status: 201 }
      );
    } catch (err: any) {
      await prisma.transaccion.delete({ where: { id: transaccion.id } });
      return NextResponse.json(
        { error: "Mercado Pago error", detail: err?.message ?? String(err) },
        { status: 502 }
      );
    }
  }

  // --- EFECTIVO: synchronous, immediate capture ---
  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje:    id_viaje,
      idPasajero: id_pasajero,
      idConductor: userId,
      metodoPago: "EFECTIVO",
      monto,
      estado:     "CONFIRMADO",
    },
  });

  await Promise.all([
    registrarEnBilletera(userId, monto, true),
    registrarEnBanco(monto),
  ]);

  const riderUrl = process.env.RIDER_APP_URL;
  if (riderUrl) {
    fetch(`${riderUrl}/api/viajes/${id_viaje}/pago-confirmado`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id_transaccion: transaccion.id, estado: "CAPTURED", monto }),
    }).catch(() => {});
  }

  return NextResponse.json(
    { id_transaccion: transaccion.id, estado: "CAPTURED" },
    { status: 201 }
  );
}
