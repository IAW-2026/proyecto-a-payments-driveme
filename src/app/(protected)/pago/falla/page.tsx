import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago rechazado — DriveMe",
  robots: { index: false, follow: false },
};

export default async function PagoFallaPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status?: string; merchant_order_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", textAlign: "center" }}>
      <div className="glass-card" style={{ padding: "2.5rem" }}>
        <p style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✕</p>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          El pago fue rechazado
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Mercado Pago no pudo procesar el pago. Verificá los datos de tu método de pago e intentá de nuevo.
        </p>
        {params.payment_id && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace", marginBottom: "1.5rem" }}>
            ID de referencia: {params.payment_id}
          </p>
        )}
        <Link href="/" className="btn-primary" style={{ display: "inline-block" }}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
