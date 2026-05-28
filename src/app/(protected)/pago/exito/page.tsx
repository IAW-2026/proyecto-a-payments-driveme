import type { Metadata } from "next";
import Link from "next/link";
import { Payment } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pago exitoso — DriveMe",
  robots: { index: false, follow: false },
};

const NETO  = 0.90;
const CORTE = 0.10;

async function confirmPayment(paymentId: string) {
  try {
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentId });

    if (paymentData.status !== "approved") return;

    const id_transaccion = paymentData.external_reference;
    if (!id_transaccion) return;

    const transaccion = await prisma.transaccion.findUnique({ where: { id: id_transaccion } });
    if (!transaccion || transaccion.estado !== "PENDIENTE") return; // idempotency

    const monto = Number(transaccion.monto);
    const neto  = monto * NETO;
    const corte = monto * CORTE;

    await prisma.$transaction([
      prisma.transaccion.update({
        where: { id: id_transaccion },
        data: {
          estado:         "CONFIRMADO",
          detalleGateway: { payment_id: paymentId, status: "approved" },
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
  } catch {
    // fail silently — webhook will catch it if it arrives later
  }
}

export default async function PagoExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status?: string; merchant_order_id?: string }>;
}) {
  const params = await searchParams;

  if (params.payment_id && params.status === "approved") {
    await confirmPayment(params.payment_id);
  }

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", textAlign: "center" }}>
      <div className="glass-card" style={{ padding: "2.5rem" }}>
        <p style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✓</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          ¡Pago realizado!
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          El cobro fue procesado correctamente por Mercado Pago.
        </p>
        {params.payment_id && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace", marginBottom: "1.5rem" }}>
            ID de pago: {params.payment_id}
          </p>
        )}
        <Link href="/" className="btn-primary" style={{ display: "inline-block" }}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
