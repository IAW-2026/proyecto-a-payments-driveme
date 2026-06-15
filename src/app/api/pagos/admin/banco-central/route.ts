import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdmin } from "@/lib/validators";
import { validateServiceToken } from "@/lib/service-auth";

export async function GET(req: Request) {
  const isControlPlane = validateServiceToken(req, "CONTROL_PLANE_SECRET");
  if (!isControlPlane && !(await validateAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bancoCentral = await prisma.bancoCentral.findUnique({ where: { id: "main" } });

  if (!bancoCentral) {
    return NextResponse.json({
      fondosEmpresa:            0,
      fondosADebitar:           0,
      fondosDebitadosHistorico: 0,
      fechaActualizacion:       null,
    });
  }

  return NextResponse.json({
    fondosEmpresa:            Number(bancoCentral.fondosEmpresa),
    fondosADebitar:           Number(bancoCentral.fondosADebitar),
    fondosDebitadosHistorico: Number(bancoCentral.fondosDebitadosHistorico),
    fechaActualizacion:       bancoCentral.fechaActualizacion,
  });
}
