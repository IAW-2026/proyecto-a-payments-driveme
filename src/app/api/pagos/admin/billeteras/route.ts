import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdmin } from "@/lib/validators";
import { validateServiceToken } from "@/lib/service-auth";

export async function GET(req: Request) {
  const isControlPlane = validateServiceToken(req, "CONTROL_PLANE_SECRET");
  if (!isControlPlane && !(await validateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idConductor = searchParams.get("idConductor");

  const billeteras = await prisma.billetera.findMany({
    where: idConductor ? { idConductor } : undefined,
    orderBy: { fechaActualizacion: "desc" },
  });

  return NextResponse.json(
    billeteras.map((b) => ({
      id:                b.id,
      idConductor:       b.idConductor,
      montoPendiente:    Number(b.montoPendiente),
      montoLiquidado:    Number(b.montoLiquidado),
      fechaActualizacion: b.fechaActualizacion,
    }))
  );
}
