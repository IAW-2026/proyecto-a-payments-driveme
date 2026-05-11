import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/semana";

function simulateGateway(monto: number) {
  const success = Math.random() > 0.05;
  return {
    estado: success ? "CAPTURED" : "FAILED",
    gatewayTransactionId: crypto.randomUUID(),
    detalle: { success, monto, ts: new Date().toISOString() },
  } as const;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await getUserRole(userId);
  if (rol !== Rol.DRIVER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id_viaje, id_pasajero, monto, tipo } = body;

  if (!id_viaje || !id_pasajero || monto == null || !tipo) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (tipo !== "TARJETA" && tipo !== "EFECTIVO") {
    return NextResponse.json({ error: "tipo must be TARJETA or EFECTIVO" }, { status: 400 });
  }

  let metodoPagoId: string | null = null;
  let estado: string = "CAPTURED";
  let gatewayTransactionId: string | null = null;
  let detalleGateway: object | null = null;

  if (tipo === "TARJETA") {
    const metodoPago = await prisma.metodoPago.findFirst({
      where: { idUsuario: id_pasajero, tipo: "TARJETA", activo: true },
    });
    if (!metodoPago) {
      return NextResponse.json(
        { error: "No active payment method found for passenger" },
        { status: 422 }
      );
    }
    metodoPagoId = metodoPago.id;
    const gw = simulateGateway(monto);
    estado = gw.estado;
    gatewayTransactionId = gw.gatewayTransactionId;
    detalleGateway = gw.detalle;
  }

  const transaccion = await prisma.transaccion.create({
    data: {
      idViaje: id_viaje,
      idPasajero: id_pasajero,
      idConductor: userId,
      metodoPagoId,
      monto,
      estado: estado as any,
      gatewayProvider: tipo === "TARJETA" ? "simulado" : null,
      gatewayTransactionId,
      detalleGateway: detalleGateway ?? undefined,
    },
  });

  if (estado === "CAPTURED") {
    const { periodoInicio, periodoFin } = getWeekBounds();
    const fondo = await prisma.fondoSemanal.upsert({
      where: { idConductor_periodoInicio: { idConductor: userId, periodoInicio } },
      create: { idConductor: userId, periodoInicio, periodoFin, montoBruto: monto },
      update: { montoBruto: { increment: monto } },
    });
    await prisma.transaccion.update({
      where: { id: transaccion.id },
      data: { fondoSemanalId: fondo.id },
    });

    // Notify Rider App — fire and forget
    const riderUrl = process.env.RIDER_APP_URL;
    if (riderUrl) {
      fetch(`${riderUrl}/api/viajes/${id_viaje}/pago-confirmado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_transaccion: transaccion.id, estado: "CAPTURED", monto }),
      }).catch(() => {});
    }
  }

  return NextResponse.json(
    { id_transaccion: transaccion.id, estado: transaccion.estado },
    { status: 201 }
  );
}
