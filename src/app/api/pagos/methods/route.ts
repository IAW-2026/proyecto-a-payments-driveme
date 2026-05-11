import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, Rol } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const metodos = await prisma.metodoPago.findMany({
    where: { idUsuario: userId, activo: true },
    include: { tarjeta: true },
    orderBy: { fechaCreacion: "desc" },
  });

  return NextResponse.json({ metodos });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rol = await getUserRole(userId);
  if (rol !== Rol.RIDER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    cvv: token,
    marca_tarjeta,
    numero_tarjeta,
    mes_vencimiento,
    direccion_facturacion,
  } = body;
  const anio_vencimiento: number = body["año_vencimiento"];

  if (!token || !marca_tarjeta || !numero_tarjeta || !mes_vencimiento || !anio_vencimiento) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const marcaMap: Record<string, "VISA" | "MASTERCARD" | "AMEX" | "OTHER"> = {
    VISA: "VISA",
    MASTERCARD: "MASTERCARD",
    AMEX: "AMEX",
  };
  const marca = marcaMap[String(marca_tarjeta).toUpperCase()] ?? "OTHER";
  const lastFour = Number(String(numero_tarjeta).replace(/\D/g, "").slice(-4));

  const metodoPago = await prisma.metodoPago.create({
    data: {
      idUsuario: userId,
      tipo: "TARJETA",
      token,
      gatewayProvider: "simulado",
      tarjeta: {
        create: {
          numeroEnmascarado: `•••• ${lastFour}`,
          marca,
          numero: lastFour,
          mesVencimiento: Number(mes_vencimiento),
          anioVencimiento: Number(anio_vencimiento),
          nombreTitular: userId,
          direccionFacturacion: direccion_facturacion ?? null,
        },
      },
    },
    include: { tarjeta: true },
  });

  return NextResponse.json(metodoPago, { status: 201 });
}
