import type { Metadata } from 'next'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import DebugNav from './DebugNav'
import SectionHeader from '@/components/SectionHeader'
import SeedTransaccionForm from './SeedTransaccionForm'
import SeedBilleteraForm from './SeedBilleteraForm'
import QuickPreview from './QuickPreview'
import RoleForm from './RoleForm'
import SyncClerkUsersForm from './SyncClerkUsersForm'
import ResetPanel from './ResetPanel'
import EndpointsTab from './EndpointsTab'
import MockGetTransaccionesForm from './MockGetTransaccionesForm'
import MockGetLiquidacionesForm from './MockGetLiquidacionesForm'

export const metadata: Metadata = {
  title: 'Debug — DriveMe Payments',
  description: 'Panel de desarrollo y prueba de endpoints',
  robots: { index: false, follow: false },
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
            Verifica si un conductor ya tiene billetera. Si no existe, la crea con saldo cero.
          </p>
          <SeedBilleteraForm />

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
          <SectionHeader title="Sincronización Clerk → DB" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Registra en la DB los usuarios que iniciaron sesión en Clerk pero no tienen fila en <code>usuarios</code>.
            Útil cuando el webhook <code>user.created</code> no estaba configurado al momento del registro.
          </p>
          <SyncClerkUsersForm />

          <SectionHeader title="Roles de Usuario" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Asigna o modifica el rol de un usuario por su Clerk ID.
          </p>
          <RoleForm />
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
      {tab === 'endpoints' && <EndpointsTab />}

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
