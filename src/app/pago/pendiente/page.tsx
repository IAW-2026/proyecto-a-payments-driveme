import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago pendiente — DriveMe",
  robots: { index: false, follow: false },
};

export default async function PagoPendientePage({
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
            border: "2px solid var(--warning)",
            borderRadius: "4px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--warning)", fontSize: "1.2rem", fontFamily: "var(--font-michroma)",
            letterSpacing: "0.1em",
            boxShadow: "0 0 20px rgba(217,119,6,0.2)",
          }}>···</div>
        </div>
        <h1 style={{ fontSize: "1rem", fontWeight: 400, fontFamily: "var(--font-michroma)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          Pago en proceso
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Tu pago está siendo revisado. Te notificaremos cuando se confirme. Esto puede demorar unos minutos.
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
