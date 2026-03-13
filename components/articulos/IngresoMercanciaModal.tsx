'use client'

import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { inventarioService } from '@/services/inventario-service'
import { toast } from 'sonner'

type ArticuloLike = {
  id: string
  nombre: string
  codigo: string
  stock: number
}

interface IngresoMercanciaModalProps {
  isOpen: boolean
  onClose: () => void
  articulos: ArticuloLike[]
  onSuccess: () => void
}

export default function IngresoMercanciaModal({
  isOpen,
  onClose,
  articulos,
  onSuccess,
}: IngresoMercanciaModalProps) {
  const [articuloId, setArticuloId] = useState<string>('')
  const [cantidad, setCantidad] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const selected = useMemo(
    () => articulos.find((a) => a.id === articuloId) ?? null,
    [articulos, articuloId],
  )

  const reset = () => {
    setArticuloId('')
    setCantidad('')
  }

  const handleClose = () => {
    if (!loading) {
      reset()
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!selected) return

    const qty = Number(cantidad)
    if (!Number.isFinite(qty) || qty <= 0) return

    setLoading(true)
    try {
      await inventarioService.actualizarProducto(selected.id, {
        stock: Number(selected.stock) + qty,
      })
      onSuccess()
      reset()
      onClose()
      toast.success('Ingreso registrado correctamente')
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'No se pudo registrar el ingreso de mercancía'
      toast.error(String(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ingreso de mercancía"
      size="md"
      backdropClosable={false}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selected || Number(cantidad) <= 0}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : 'Registrar ingreso'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Artículo</label>
          <select
            value={articuloId}
            onChange={(e) => setArticuloId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary"
          >
            <option value="">Seleccione un artículo</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} — {a.nombre}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-2 text-xs text-slate-500 font-medium">
              Stock actual: <span className="font-black text-slate-900">{selected.stock}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Cantidad a ingresar</label>
          <input
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Ej: 10"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-primary"
          />
        </div>

        {selected && Number(cantidad) > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nuevo stock</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {Number(selected.stock) + Number(cantidad)}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
