'use client'

import { useState } from 'react'
import SectionHeader from '@/components/SectionHeader'
import TestPostTransaccionForm from './TestPostTransaccionForm'
import TestPutTransaccionForm from './TestPutTransaccionForm'
import TestPatchTransaccionForm from './TestPatchTransaccionForm'
import TestPostLiquidacionForm from './TestPostLiquidacionForm'

export default function EndpointsTab() {
  const [lastTxId, setLastTxId]             = useState('')
  const [lastSolicitudId, setLastSolicitudId] = useState('')
  const [lastMetodoPago, setLastMetodoPago] = useState<'EFECTIVO' | 'MERCADO_PAGO'>('EFECTIVO')

  function handleCreada(id_transaccion: string, metodo_pago: string, id_solicitud: string) {
    setLastTxId(id_transaccion)
    setLastSolicitudId(id_solicitud)
    setLastMetodoPago(metodo_pago as 'EFECTIVO' | 'MERCADO_PAGO')
  }

  return (
    <>
      <SectionHeader title="POST /api/pagos/transacciones — crear transacción" />
      <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>EFECTIVO (Driver):</strong> crea y procesa en un solo paso, devuelve <code>CONFIRMADO</code>.{' '}
        <strong>MERCADO_PAGO (Rider):</strong> crea <code>PENDIENTE</code> sin conductor — luego usar PUT.
      </p>
      <TestPostTransaccionForm onCreada={handleCreada} />

      {lastMetodoPago === 'MERCADO_PAGO' && lastTxId && (
        <>
          <SectionHeader title="PUT /api/pagos/transacciones — generar preferencia MP (Rider)" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Solo para <strong>MERCADO_PAGO</strong>. Genera la preferencia en MP y devuelve el <code>init_point</code> para el checkout.
            Pre-rellena el ID de la última transacción creada.
          </p>
          <TestPutTransaccionForm defaultIdTransaccion={lastTxId} />

          <SectionHeader title="PATCH /api/pagos/transacciones — fin de viaje MP (Driver)" />
          <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Solo para <strong>MERCADO_PAGO</strong>. Simula Driver App al terminar el viaje: completa la transacción con viaje y conductor,
            y acredita la billetera. Requiere que el pago ya esté <code>CONFIRMADO</code> por el webhook de MP.
            Pre-rellena el ID de la última solicitud creada.
          </p>
          <TestPatchTransaccionForm defaultIdSolicitud={lastSolicitudId} />
        </>
      )}

      <SectionHeader title="POST /api/pagos/liquidaciones — liquidar conductor (Driver)" />
      <p className="page-sub" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
        Llama directamente al endpoint de producción como lo haría la Driver App para solicitar su pago.
      </p>
      <TestPostLiquidacionForm />
    </>
  )
}
