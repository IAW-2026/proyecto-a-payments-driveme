'use client'

import { useState } from 'react'
import SectionHeader from '@/components/SectionHeader'
import TestPostTransaccionForm from './TestPostTransaccionForm'
import TestPutTransaccionForm from './TestPutTransaccionForm'
import TestPostLiquidacionForm from './TestPostLiquidacionForm'

export default function EndpointsTab() {
  const [lastTxId, setLastTxId]             = useState('')
  const [lastMetodoPago, setLastMetodoPago] = useState<'EFECTIVO' | 'MERCADO_PAGO'>('EFECTIVO')

  function handleCreada(id: string, metodoPago: string) {
    setLastTxId(id)
    setLastMetodoPago(metodoPago as 'EFECTIVO' | 'MERCADO_PAGO')
  }

  return (
    <>
      <SectionHeader title="POST /api/pagos/transacciones — crear transacción (Rider)" />
      <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        Simula la llamada de la Rider App. El servidor usa <code>RIDER_SERVICE_SECRET</code> internamente — idéntico a lo que enviaría la app real.
      </p>
      <TestPostTransaccionForm onCreada={handleCreada} />

      <SectionHeader title="PUT /api/pagos/transacciones — procesar transacción" />
      <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        El servidor usa <code>DRIVER_SERVICE_SECRET</code> o <code>RIDER_SERVICE_SECRET</code> según la perspectiva seleccionada — idéntico a lo que enviaría la app real.
      </p>
      <TestPutTransaccionForm
        defaultIdTransaccion={lastTxId}
        defaultPerspectiva={lastMetodoPago === 'MERCADO_PAGO' ? 'RIDER' : 'DRIVER'}
      />

      <SectionHeader title="POST /api/pagos/liquidaciones — liquidar conductor (Driver)" />
      <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        Llama directamente al endpoint de producción como lo haría la Driver App para solicitar su pago.
      </p>
      <TestPostLiquidacionForm />
    </>
  )
}
