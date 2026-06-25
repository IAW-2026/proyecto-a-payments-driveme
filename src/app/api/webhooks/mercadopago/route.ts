import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";

async function notifyRider(id_solicitud: string, id_transaccion: string, estado_pago: "APROBADO" | "RECHAZADO", monto: number) {
  const riderUrl = process.env.RIDER_APP_URL?.trim();
  if (!riderUrl) { console.error("[notifyRider] RIDER_APP_URL no configurado"); return; }
  try {
    const res = await fetch(`${riderUrl}/api/solicitudes/${id_solicitud}/pagos`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${process.env.PAYMENTS_SERVICE_SECRET ?? ""}`,
      },
      body: JSON.stringify({ id_solicitud, estado_pago, id_transaccion, monto }),
    });
    if (!res.ok) console.error("[notifyRider] falló:", res.status, await res.text());
  } catch (e) {
    console.error("[notifyRider] error de red:", e);
  }
}

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
    // Confirm the transaction. Billetera and BancoCentral are updated later
    // via PATCH /transacciones once the driver completes the trip and idConductor is known.
    await prisma.transaccion.update({
      where: { id: id_transaccion },
      data: {
        estado:         "CONFIRMADO",
        detalleGateway: { payment_id: paymentId, status: paymentData.status },
      },
    });

    if (transaccion.idSolicitud) {
      await notifyRider(transaccion.idSolicitud, id_transaccion, "APROBADO", Number(transaccion.monto));
    }
  } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
    await prisma.transaccion.update({
      where: { id: id_transaccion },
      data: {
        estado:         "CANCELADO",
        detalleGateway: { payment_id: paymentId, status: paymentData.status },
      },
    });

    if (transaccion.idSolicitud) {
      await notifyRider(transaccion.idSolicitud, id_transaccion, "RECHAZADO", Number(transaccion.monto));
    }
  }

  return NextResponse.json({ ok: true });
}
