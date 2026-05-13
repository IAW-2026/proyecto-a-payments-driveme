import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await getUserRole(userId);
  if (rol !== Rol.DRIVER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const billetera = await prisma.billetera.findUnique({ where: { idConductor: userId } });

  if (!billetera) {
    return NextResponse.json({ error: "No wallet found for this driver" }, { status: 404 });
  }

  const semana = Number(billetera.montoSemanaActual);
  const retenido = Number(billetera.montoRetenidoSemanaActual);
  const montoPagado = semana - retenido;

  if (montoPagado <= 0) {
    return NextResponse.json(
      { error: "Net payout is zero or negative after refund deductions" },
      { status: 422 }
    );
  }

  const ahora = new Date();

  const [liquidacion] = await prisma.$transaction([
    prisma.liquidacion.create({
      data: {
        idConductor: userId,
        montoPagado,
        estado: "PROCESADA",
        fechaProgramada: ahora,
        fechaEjecutada:  ahora,
        detalle: { mensaje: "Payout solicitado por el conductor" },
      },
    }),
    prisma.billetera.update({
      where: { idConductor: userId },
      data: {
        montoHistorico:           { increment: semana },
        montoRetenidoHistorico:   { increment: retenido },
        montoSemanaActual:        0,
        montoRetenidoSemanaActual: 0,
      },
    }),
    prisma.bancoCentral.update({
      where: { id: "main" },
      data: {
        fondosADebitar:           { decrement: montoPagado },
        fondosDebitadosHistorico: { increment: montoPagado },
      },
    }),
  ]);

  return NextResponse.json({
    id_liquidacion: liquidacion.id,
    monto_pagado:   montoPagado,
    estado:         liquidacion.estado,
  });
}
