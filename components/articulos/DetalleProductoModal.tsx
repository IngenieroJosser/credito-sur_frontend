'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { inventarioService, Producto } from '@/services/inventario-service'
import { formatCurrency } from '@/lib/utils'

interface DetalleProductoModalProps {
  id: string
  onClose: () => void
}

export default function DetalleProductoModal({ id, onClose }: DetalleProductoModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [producto, setProducto] = useState<Producto | null>(null)

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    const fetchProducto = async () => {
      setLoading(true)
      try {
        const data = await inventarioService.obtenerProductoPorId(id)
        setProducto(data)
      } catch {
        setProducto(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProducto()
  }, [id])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
      <div className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className={`relative w-full bg-white shadow-2xl flex flex-col transition-all duration-200 ease-out h-[100dvh] sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl sm:max-w-3xl ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto sm:rounded-2xl p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Cargando detalle del artículo...</p>
            </div>
          ) : producto ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventario</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">{producto.nombre}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">SKU: {producto.codigo}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Categoría</div>
                  <div className="mt-1 font-bold text-slate-900">{producto.categoria}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase">Marca / Modelo</div>
                  <div className="mt-1 font-bold text-slate-900">{producto.marca || '—'} {producto.modelo || ''}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-bold text-slate-500 uppercase">Costo</div>
                  <div className="mt-1 font-black text-slate-900">{formatCurrency(Number(producto.costo) || 0)}</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-bold text-slate-500 uppercase">Stock</div>
                  <div className="mt-1 font-black text-slate-900">{producto.stock} unidades</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[40vh]">
              <p className="text-slate-500 font-medium">No se encontró información del artículo.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
