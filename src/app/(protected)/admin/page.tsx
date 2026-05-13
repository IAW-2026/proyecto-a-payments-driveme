import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { getUserRole, Rol } from '@/lib/roles'
import { redirect } from 'next/navigation'
import AdminNav from './AdminNav'
import RoleForm from './RoleForm'
import SeedTransaccionForm from './SeedTransaccionForm'
import SeedReembolsoForm from './SeedReembolsoForm'
import SeedBilleteraForm from './SeedBilleteraForm'
import SeedBancoForm from './SeedBancoForm'
import QuickPreview from './QuickPreview'
import UpdateTransaccionForm from './UpdateTransaccionForm'
import UpdateReembolsoForm from './UpdateReembolsoForm'
import UpdateBilleteraForm from './UpdateBilleteraForm'
import TestProcesarForm from './TestProcesarForm'
import TestLiquidarForm from './TestLiquidarForm'
import TestReembolsoForm from './TestReembolsoForm'

export const metadata: Metadata = {
  title: 'Admin — DriveMe Payments',
  description: 'Panel de administración y datos de prueba',
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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { userId } = await auth()
  if (!userId || (await getUserRole(userId)) !== Rol.ADMIN) redirect('/')

  const { tab = 'seed' } = await searchParams

  return (
    <main className="page-shell" style={{ maxWidth: '960px' }}>
      <h1 className="page-title">Panel de Administración</h1>
      <p className="page-sub">Gestión de roles y datos de prueba</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Link href="/transacciones" className="btn-ghost">Ver Transacciones →</Link>
        <Link href="/fondos" className="btn-ghost">Ver Panel Financiero →</Link>
      </div>

      <Suspense fallback={<div style={{ height: '2.75rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }} />}>
        <AdminNav />
      </Suspense>

      {tab === 'seed' && (
        <>
          <SectionHeader title="Seed — Transacciones" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Crea o actualiza una transacción (upsert por ID de viaje). CONFIRMADO actualiza automáticamente Billetera y Banco Central.
          </p>
          <SeedTransaccionForm />

          <SectionHeader title="Seed — Reembolsos" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Crea o actualiza un reembolso sobre una transacción existente. COMPLETED actualiza Billetera, Banco Central y marca la transacción como REEMBOLSADO.
          </p>
          <SeedReembolsoForm />

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

      {tab === 'update' && (
        <>
          <SectionHeader title="Roles de Usuario" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Asigna o modifica el rol de un usuario por su Clerk ID.
          </p>
          <RoleForm />

          <SectionHeader title="Update — Transacción" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Busca una transacción por ID y cambia su estado. Cambiar a CONFIRMADO actualiza Billetera y Banco Central; cambiar a REEMBOLSADO revierte el saldo del conductor.
          </p>
          <UpdateTransaccionForm />

          <SectionHeader title="Update — Reembolso" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Busca un reembolso por ID y cambia su estado. Cambiar a COMPLETED aplica los efectos en Billetera, Banco Central y marca la transacción como REEMBOLSADO.
          </p>
          <UpdateReembolsoForm />

          <SectionHeader title="Update — Billetera" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Carga la billetera de un conductor y sobreescribe los montos directamente (no incrementa).
          </p>
          <UpdateBilleteraForm />
        </>
      )}

      {tab === 'test' && (
        <>
          <SectionHeader title="Test — Procesar Transacción" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Simula el flujo completo de procesamiento de un viaje (igual a <code>/api/pagos/procesar</code>). Muestra el estado de Billetera y Banco Central antes y después.
          </p>
          <TestProcesarForm />

          <SectionHeader title="Test — Liquidar al Conductor" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Ejecuta la liquidación semanal de un conductor (igual a <code>/api/pagos/liquidar</code>). Resetea los fondos semanales y los mueve al histórico.
          </p>
          <TestLiquidarForm />

          <SectionHeader title="Test — Reembolso al Pasajero" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Procesa un reembolso sobre una transacción CONFIRMADO (igual a <code>/api/pagos/[id]/refunds</code>). El ID de pasajero debe coincidir con el de la transacción.
          </p>
          <TestReembolsoForm />
        </>
      )}
    </main>
  )
}
