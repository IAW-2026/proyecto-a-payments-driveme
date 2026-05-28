import { NextResponse } from "next/server";
import { Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { validateDriver, resolveCallerUser } from "@/lib/validators";

const NETO = 0.90;

// POST — driver (or admin) triggers liquidation of all pending confirmed transactions
export async function POST(req: Request) {
  const caller = await validateDriver(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let idConductor = caller.id;
  if (caller.rol === Rol.ADMIN) {
    const body = await req.json().catch(() => ({}));
    idConductor = body.id_conductor ?? caller.id;
  }

  const pendientes = await prisma.transaccion.findMany({
    where: {
      idConductor,
      estado:            "CONFIRMADO",
      estadoLiquidacion: "PENDIENTE",
    },
    select: { id: true, monto: true },
  });

  if (pendientes.length === 0) {
    return NextResponse.json({ error: "No pending transactions to liquidate" }, { status: 422 });
  }

  const montoPagado = pendientes.reduce((acc, tx) => acc + Number(tx.monto) * NETO, 0);
  const ids = pendientes.map((tx) => tx.id);
  const ahora = new Date();

  const [liquidacion] = await prisma.$transaction([
    prisma.liquidacion.create({
      data: {
        idConductor,
        montoPagado,
        estado:          "PROCESADA",
        fechaProgramada: ahora,
        fechaEjecutada:  ahora,
        detalle: { transacciones: ids, mensaje: "Payout solicitado por el conductor" },
      },
    }),
    prisma.transaccion.updateMany({
      where: { id: { in: ids } },
      data:  { estadoLiquidacion: "LIQUIDADO" },
    }),
    prisma.billetera.upsert({
      where:  { idConductor },
      create: { idConductor, montoLiquidado: montoPagado, montoPendiente: 0 },
      update: { montoLiquidado: { increment: montoPagado }, montoPendiente: 0 },
    }),
    prisma.bancoCentral.upsert({
      where:  { id: "main" },
      create: { id: "main", fondosDebitadosHistorico: montoPagado },
      update: {
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

// GET — returns billetera summary and liquidation history for a driver
export async function GET(req: Request) {
  const caller = await validateDriver(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idConductor = caller.rol === Rol.ADMIN
    ? (searchParams.get("idConductor") ?? caller.id)
    : caller.id;
  if (!idConductor) return NextResponse.json({ error: "Missing idConductor" }, { status: 400 });

  const [billetera, liquidaciones] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor } }),
    prisma.liquidacion.findMany({
      where:   { idConductor },
      orderBy: { fechaCreacion: "desc" },
    }),
  ]);

  return NextResponse.json({
    montoPendiente: Number(billetera?.montoPendiente ?? 0),
    montoLiquidado: Number(billetera?.montoLiquidado ?? 0),
    liquidaciones,
  });
}
