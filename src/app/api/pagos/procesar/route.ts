import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUser, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const CORTE = 0.10;
const NETO  = 0.90;

function simulateGateway(monto: number) {
  const success = Math.random() > 0.05;
  return {
    estado: success ? "CONFIRMADO" : "CANCELADO",
    gatewayTransactionId: crypto.randomUUID(),
    detalle: { success, monto, ts: new Date().toISOString() },
  } as const;
}

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

  let estado: "CONFIRMADO" | "CANCELADO" = "CONFIRMADO";
  let gatewayTransactionId: string | null = null;
  let detalleGateway: object | null = null;

  if (metodo_pago === "MERCADO_PAGO") {
    const gw = simulateGateway(monto);
    estado = gw.estado;
    gatewayTransactionId = gw.gatewayTransactionId;
    detalleGateway = gw.detalle;
  }

  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje:    id_viaje,
      idPasajero: id_pasajero,
      idConductor: userId,
      metodoPago: metodo_pago as any,
      monto,
      estado: estado as any,
      gatewayProvider:      metodo_pago === "MERCADO_PAGO" ? "mp_sandbox" : null,
      gatewayTransactionId,
      detalleGateway: detalleGateway ?? undefined,
    },
  });

  if (estado === "CONFIRMADO") {
    await Promise.all([
      registrarEnBilletera(userId, monto, metodo_pago === "EFECTIVO"),
      registrarEnBanco(monto),
    ]);

    const riderUrl = process.env.RIDER_APP_URL;
    if (riderUrl) {
      fetch(`${riderUrl}/api/viajes/${id_viaje}/pago-confirmado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_transaccion: transaccion.id, estado: "CONFIRMADO", monto }),
      }).catch(() => {});
    }
  }

  return NextResponse.json(
    { id_transaccion: transaccion.id, estado: transaccion.estado },
    { status: 201 }
  );
}
