import type { Metadata } from "next";
import { Payment } from "mercadopago";
import { mpClient } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pago exitoso — DriveMe",
  robots: { index: false, follow: false },
};

async function confirmPayment(paymentId: string) {
  try {
    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: paymentId });

    if (paymentData.status !== "approved") return;

    const id_transaccion = paymentData.external_reference;
    if (!id_transaccion) return;

    const transaccion = await prisma.transaccion.findUnique({ where: { id: id_transaccion } });
    if (!transaccion) return;

    // Update DB only if still PENDIENTE (webhook may have already done it)
    if (transaccion.estado === "PENDIENTE") {
      await prisma.transaccion.update({
        where: { id: id_transaccion },
        data: {
          estado:         "CONFIRMADO",
          detalleGateway: { payment_id: paymentId, status: "approved" },
        },
      });
    }

    // Always notify rider — Rider App must handle duplicates idempotently
    const riderUrl = process.env.RIDER_APP_URL;
    if (riderUrl && transaccion.idSolicitud) {
      fetch(`${riderUrl}/api/solicitudes/${transaccion.idSolicitud}/pagos`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${process.env.PAYMENTS_SERVICE_SECRET ?? ""}`,
        },
        body: JSON.stringify({
          id_solicitud:   transaccion.idSolicitud,
          estado_pago:    "APROBADO",
          id_transaccion,
          monto:          Number(transaccion.monto),
        }),
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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div style={{
            width: "56px", height: "56px",
            border: "2px solid var(--success)",
            borderRadius: "4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--success)", fontSize: "1.5rem", fontFamily: "var(--font-michroma)",
            boxShadow: "0 0 20px rgba(5,150,105,0.2)",
          }}>✓</div>
        </div>
        <h1 style={{ fontSize: "1rem", fontWeight: 400, fontFamily: "var(--font-michroma)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Pago realizado
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          El cobro fue procesado correctamente por Mercado Pago.
        </p>
        {params.payment_id && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace", marginBottom: "1.5rem" }}>
            ID de pago: {params.payment_id}
          </p>
        )}
        <a href={process.env.RIDER_APP_URL ?? "/"} className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
