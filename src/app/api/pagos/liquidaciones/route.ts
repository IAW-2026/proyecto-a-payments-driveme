import { NextResponse } from "next/server";
import { Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { validateDriver, resolveCallerUser } from "@/lib/validators";
import { validateServiceToken } from "@/lib/service-auth";

const NETO = 0.90;

async function ejecutarLiquidacion(idConductor: string) {
  const [billetera, pendientes] = await Promise.all([
    prisma.billetera.findUnique({ where: { idConductor }, select: { montoPendiente: true } }),
    prisma.transaccion.findMany({
      where: { idConductor, estado: "CONFIRMADO", estadoLiquidacion: "PENDIENTE" },
      select: { id: true },
    }),
  ]);

  const montoPagado = Number(billetera?.montoPendiente ?? 0);

  if (montoPagado === 0 && pendientes.length === 0) {
    return { error: "No pending transactions to liquidate" } as const;
  }

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

  return { id_liquidacion: liquidacion.id, monto_pagado: montoPagado, estado: liquidacion.estado };
}

// POST — driver (or admin) triggers liquidation of all pending confirmed transactions
export async function POST(req: Request) {
  if (validateServiceToken(req, "CONTROL_PLANE_SECRET")) {
    const body = await req.json().catch(() => ({}));
    const idConductor: string | undefined = body.id_conductor;
    if (!idConductor) return NextResponse.json({ error: "Missing id_conductor" }, { status: 400 });
    const result = await ejecutarLiquidacion(idConductor);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json(result);
  }

  const caller = await validateDriver(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let idConductor = caller.id;
  if (caller.rol === Rol.ADMIN) {
    const body = await req.json().catch(() => ({}));
    idConductor = body.id_conductor ?? caller.id;
  }

  const result = await ejecutarLiquidacion(idConductor);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result);
}

// GET — returns liquidation history
// Control Plane uses CONTROL_PLANE_SECRET — returns all liquidaciones with optional ?idConductor= filter
// Drivers/admins get billetera summary + their own liquidaciones
export async function GET(req: Request) {
  if (validateServiceToken(req, "CONTROL_PLANE_SECRET")) {
    const { searchParams } = new URL(req.url);
    const idConductor = searchParams.get("idConductor");
    const liquidaciones = await prisma.liquidacion.findMany({
      where:   idConductor ? { idConductor } : undefined,
      orderBy: { fechaCreacion: "desc" },
    });
    return NextResponse.json(liquidaciones);
  }

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
