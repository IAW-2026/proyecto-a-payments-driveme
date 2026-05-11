import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/semana";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await getUserRole(userId);
  if (rol !== Rol.RIDER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { monto, razon } = body;

  if (monto == null || !razon) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const transaccion = await prisma.transaccion.findUnique({
    where: { id },
    include: { fondoSemanal: true },
  });

  if (!transaccion) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (transaccion.idPasajero !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (transaccion.estado !== "CAPTURED") {
    return NextResponse.json(
      { error: "Only CAPTURED transactions can be refunded" },
      { status: 422 }
    );
  }
  if (Number(monto) > Number(transaccion.monto)) {
    return NextResponse.json(
      { error: "Refund amount exceeds transaction amount" },
      { status: 422 }
    );
  }

  // Determine which fund to debit
  let fondoSemanalId: string;
  if (transaccion.fondoSemanal && transaccion.fondoSemanal.estado !== "LIQUIDADO") {
    fondoSemanalId = transaccion.fondoSemanal.id;
  } else {
    // Original fund already paid out — absorb into driver's current open week
    const { periodoInicio, periodoFin } = getWeekBounds();
    const fondoActual = await prisma.fondoSemanal.upsert({
      where: {
        idConductor_periodoInicio: {
          idConductor: transaccion.idConductor,
          periodoInicio,
        },
      },
      create: { idConductor: transaccion.idConductor, periodoInicio, periodoFin },
      update: {},
    });
    fondoSemanalId = fondoActual.id;
  }

  const [reembolso] = await prisma.$transaction([
    prisma.reembolso.create({
      data: { transaccionId: transaccion.id, fondoSemanalId, monto, razon },
    }),
    prisma.fondoSemanal.update({
      where: { id: fondoSemanalId },
      data: { montoRetenido: { increment: monto } },
    }),
  ]);

  return NextResponse.json(
    { id_reembolso: reembolso.id, id_transaccion: transaccion.id, estado: reembolso.estado },
    { status: 201 }
  );
}
