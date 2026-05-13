import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

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

  const transaccion = await prisma.transaccion.findUnique({ where: { id } });

  if (!transaccion) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }
  if (transaccion.idPasajero !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (transaccion.estado !== "CONFIRMADO") {
    return NextResponse.json(
      { error: "Only CONFIRMADO transactions can be refunded" },
      { status: 422 }
    );
  }
  if (Number(monto) > Number(transaccion.monto)) {
    return NextResponse.json(
      { error: "Refund amount exceeds transaction amount" },
      { status: 422 }
    );
  }

  const [reembolso] = await prisma.$transaction([
    prisma.reembolso.create({
      data: { transaccionId: transaccion.id, monto, razon, estado: "COMPLETED" },
    }),
    prisma.billetera.update({
      where: { idConductor: transaccion.idConductor },
      data: {
        montoSemanaActual:         { decrement: monto },
        montoRetenidoSemanaActual: { increment: monto },
      },
    }),
    prisma.bancoCentral.update({
      where: { id: "main" },
      data: { fondosReembolsadosHistorico: { increment: monto } },
    }),
    prisma.transaccion.update({
      where: { id: transaccion.id },
      data:  { estado: "REEMBOLSADO" },
    }),
  ]);

  return NextResponse.json(
    { id_reembolso: reembolso.id, id_transaccion: transaccion.id, estado: reembolso.estado },
    { status: 201 }
  );
}
