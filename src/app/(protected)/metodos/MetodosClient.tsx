'use client'

import { useState } from 'react'
import AddCardForm from './AddCardForm'

type Tarjeta = { numeroEnmascarado: string; marca: string; mesVencimiento: number; anioVencimiento: number }
type Metodo  = { id: string; tipo: string; gatewayProvider: string | null; fechaCreacion: string; tarjeta: Tarjeta | null }

export default function MetodosClient({ metodos }: { metodos: Metodo[] }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p className="page-sub" style={{ margin: 0 }}>Tus tarjetas tokenizadas guardadas</p>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)} style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}>
          {showForm ? 'Cancelar' : '+ Agregar tarjeta'}
        </button>
      </div>

      {showForm && <AddCardForm onClose={() => setShowForm(false)} />}

      {metodos.length === 0 ? (
        <div className="glass-card empty-state">
          <p>No tenés métodos de pago guardados aún.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Número</th>
                <th>Vencimiento</th>
                <th>Proveedor</th>
                <th>Agregada</th>
              </tr>
            </thead>
            <tbody>
              {metodos.map((m) => (
                <tr key={m.id}>
                  <td><span className="card-brand">{m.tarjeta?.marca ?? m.tipo}</span></td>
                  <td style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    •••• {m.tarjeta?.numeroEnmascarado}
                  </td>
                  <td style={{ color: 'var(--muted)' }}>
                    {m.tarjeta ? `${String(m.tarjeta.mesVencimiento).padStart(2,'0')}/${m.tarjeta.anioVencimiento}` : '—'}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{m.gatewayProvider ?? '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {new Date(m.fechaCreacion).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
