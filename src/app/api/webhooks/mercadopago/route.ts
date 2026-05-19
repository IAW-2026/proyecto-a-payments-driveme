import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";

const CORTE = 0.10;
const NETO  = 0.90;

export async function POST(req: Request) {
  const body = await req.json();

  // MP sends type="payment" for payment events; ignore everything else
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(body.data.id);

  const payment = new Payment(mpClient);
  const paymentData = await payment.get({ id: paymentId });

  const id_transaccion = paymentData.external_reference;
  if (!id_transaccion) return NextResponse.json({ ok: true });

  const transaccion = await prisma.transaccion.findUnique({
    where: { id: id_transaccion },
  });

  // Idempotency guard: ignore if already settled
  if (!transaccion || transaccion.estado !== "PENDIENTE") {
    return NextResponse.json({ ok: true });
  }

  if (paymentData.status === "approved") {
    const monto = Number(transaccion.monto);
    const neto  = monto * NETO;
    const corte = monto * CORTE;

    await prisma.$transaction([
      prisma.transaccion.update({
        where: { id: id_transaccion },
        data: {
          estado:         "CONFIRMADO",
          detalleGateway: { payment_id: paymentId, status: paymentData.status },
        },
      }),
      prisma.billetera.upsert({
        where:  { idConductor: transaccion.idConductor },
        create: { idConductor: transaccion.idConductor, montoPendiente: neto },
        update: { montoPendiente: { increment: neto } },
      }),
      prisma.bancoCentral.upsert({
        where:  { id: "main" },
        create: { id: "main", fondosADebitar: neto, fondosEmpresa: corte },
        update: {
          fondosADebitar: { increment: neto },
          fondosEmpresa:  { increment: corte },
        },
      }),
    ]);

    const riderUrl = process.env.RIDER_APP_URL;
    if (riderUrl) {
      fetch(`${riderUrl}/api/viajes/${transaccion.idViaje}/pago-confirmado`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id_transaccion, estado: "CAPTURED", monto }),
      }).catch(() => {});
    }
  } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
    await prisma.transaccion.update({
      where: { id: id_transaccion },
      data: {
        estado:         "CANCELADO",
        detalleGateway: { payment_id: paymentId, status: paymentData.status },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
