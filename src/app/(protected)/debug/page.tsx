import type { Metadata } from 'next'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import DebugNav from './DebugNav'
import SeedTransaccionForm from './SeedTransaccionForm'
import SeedBilleteraForm from './SeedBilleteraForm'
import SeedBancoForm from './SeedBancoForm'
import QuickPreview from './QuickPreview'
import RoleForm from './RoleForm'
import UpdateBilleteraForm from './UpdateBilleteraForm'
import ResetPanel from './ResetPanel'
import TestPostTransaccionForm from './TestPostTransaccionForm'
import TestPostLiquidacionForm from './TestPostLiquidacionForm'
import TestPutTransaccionForm from './TestPutTransaccionForm'
import MockGetTransaccionesForm from './MockGetTransaccionesForm'
import MockGetLiquidacionesForm from './MockGetLiquidacionesForm'

export const metadata: Metadata = {
  title: 'Debug — DriveMe Payments',
  description: 'Panel de desarrollo y prueba de endpoints',
  robots: { index: false, follow: false },
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-fraunces)',
      fontSize: '1.1rem',
      fontWeight: 700,
      marginTop: '2.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid var(--border)',
      color: 'var(--gold)',
    }}>
      {title}
    </h2>
  )
}

export default async function DebugPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { userId } = await auth()
  if (!userId || (await getUserRole(userId)) !== Rol.ADMIN) redirect('/')

  const { tab = 'seed' } = await searchParams

  return (
    <main className="page-shell" style={{ maxWidth: '960px' }}>
      <h1 className="page-title">Panel de Debug</h1>
      <p className="page-sub">Herramientas de desarrollo — seed, update, endpoints y simulación de GETs</p>

      <Suspense fallback={<div style={{ height: '2.75rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }} />}>
        <DebugNav />
      </Suspense>

      {/* ── SEED ──────────────────────────────────────────────────────── */}
      {tab === 'seed' && (
        <>
          <SectionHeader title="Seed — Transacciones" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Crea o actualiza una transacción (upsert por ID de viaje). CONFIRMADO actualiza automáticamente Billetera y Banco Central.
          </p>
          <SeedTransaccionForm />

          <SectionHeader title="Seed — Billetera del Conductor" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Crea o incrementa la billetera de un conductor directamente. Los montos se suman al estado actual.
          </p>
          <SeedBilleteraForm />

          <SectionHeader title="Seed — Banco Central" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Incrementa los saldos del Banco Central (singleton). Útil para establecer un estado inicial antes de testear liquidaciones.
          </p>
          <SeedBancoForm />

          <SectionHeader title="Vista Rápida" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <QuickPreview type="transacciones" />
            <QuickPreview type="billetera" />
          </div>
        </>
      )}

      {/* ── UPDATE ────────────────────────────────────────────────────── */}
      {tab === 'update' && (
        <>
          <SectionHeader title="Roles de Usuario" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Asigna o modifica el rol de un usuario por su Clerk ID.
          </p>
          <RoleForm />

          <SectionHeader title="Update — Billetera" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Carga la billetera de un conductor y sobreescribe los montos. Los cambios se propagan al Banco Central.
          </p>
          <UpdateBilleteraForm />
        </>
      )}

      {/* ── RESET ─────────────────────────────────────────────────────── */}
      {tab === 'reset' && (
        <>
          <SectionHeader title="Reset & Reseed" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Volvé a un punto de partida limpio para testear. El reseed carga <code>prisma/test-seed.json</code> — editá ese archivo con tus Clerk IDs antes de usarlo.
          </p>
          <ResetPanel />
        </>
      )}

      {/* ── ENDPOINTS ─────────────────────────────────────────────────── */}
      {tab === 'endpoints' && (
        <>
          <SectionHeader title="POST /api/pagos/transacciones — crear transacción (Rider)" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Simula la llamada de la Rider App. El servidor usa <code>RIDER_SERVICE_SECRET</code> internamente — idéntico a lo que enviaría la app real.
          </p>
          <TestPostTransaccionForm />

          <SectionHeader title="PUT /api/pagos/transacciones — procesar transacción" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            El servidor usa <code>DRIVER_SERVICE_SECRET</code> o <code>RIDER_SERVICE_SECRET</code> según la perspectiva seleccionada — idéntico a lo que enviaría la app real.
          </p>
          <TestPutTransaccionForm />

          <SectionHeader title="POST /api/pagos/liquidaciones — liquidar conductor (Driver)" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Llama directamente al endpoint de producción como lo haría la Driver App para solicitar su pago.
          </p>
          <TestPostLiquidacionForm />
        </>
      )}

      {/* ── MOCKS GET ─────────────────────────────────────────────────── */}
      {tab === 'mocks' && (
        <>
          <SectionHeader title="GET /api/pagos/transacciones — vista de transacciones" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Simula la respuesta que ve la Rider App vs Driver App. El conductor ve el estado de liquidación; el pasajero no.
          </p>
          <MockGetTransaccionesForm />

          <SectionHeader title="GET /api/pagos/liquidaciones — historial del conductor" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Simula la respuesta que ve la Driver App con el resumen de billetera y el historial de liquidaciones.
          </p>
          <MockGetLiquidacionesForm />
        </>
      )}
    </main>
  )
}
