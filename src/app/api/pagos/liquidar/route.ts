import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rol = await getUserRole(userId);
  if (rol !== Rol.DRIVER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fondo = await prisma.fondoSemanal.findFirst({
    where: { idConductor: userId, estado: { not: "LIQUIDADO" } },
    orderBy: { periodoInicio: "desc" },
  });

  if (!fondo) {
    return NextResponse.json({ error: "No funds available for payout" }, { status: 404 });
  }

  const montoPagado = Number(fondo.montoBruto) - Number(fondo.montoRetenido);
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
        fondoSemanalId: fondo.id,
        idConductor: userId,
        montoPagado,
        estado: "PROCESADA",
        fechaProgramada: ahora,
        fechaEjecutada: ahora,
        detalle: { fondoId: fondo.id, mensaje: "Payout solicitado por el conductor" },
      },
    }),
    prisma.fondoSemanal.update({
      where: { id: fondo.id },
      data: { estado: "LIQUIDADO" },
    }),
  ]);

  return NextResponse.json({
    id_liquidacion: liquidacion.id,
    monto_pagado: montoPagado,
    periodo_inicio: fondo.periodoInicio,
    periodo_fin: fondo.periodoFin,
    estado: liquidacion.estado,
  });
}
