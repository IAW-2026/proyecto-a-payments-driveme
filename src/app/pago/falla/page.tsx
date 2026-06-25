import type { Metadata } from "next";

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
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <div style={{
            width: "56px", height: "56px",
            border: "2px solid var(--danger)",
            borderRadius: "4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--danger)", fontSize: "1.5rem", fontFamily: "var(--font-michroma)",
            boxShadow: "0 0 20px rgba(239,68,68,0.2)",
          }}>✕</div>
        </div>
        <h1 style={{ fontSize: "1rem", fontWeight: 400, fontFamily: "var(--font-michroma)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Pago rechazado
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Mercado Pago no pudo procesar el pago. Verificá los datos de tu método de pago e intentá de nuevo.
        </p>
        {params.payment_id && (
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace", marginBottom: "1.5rem" }}>
            ID de referencia: {params.payment_id}
          </p>
        )}
        <a href={process.env.RIDER_APP_URL ?? "/"} className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
