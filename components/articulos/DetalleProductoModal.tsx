'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { inventarioService, Producto } from '@/services/inventario-service'
import { formatCurrency } from '@/lib/utils'
import { Skeleton, SkeletonTexto, SkeletonTabla } from '@/components/ui/Skeleton'
import Tooltip from '@/components/ui/Tooltip'
import { useModalDialog } from '@/hooks/use-modal-dialog'

interface DetalleProductoModalProps {
  id: string
  onClose: () => void
}

export default function DetalleProductoModal({ id, onClose }: DetalleProductoModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [producto, setProducto] = useState<Producto | null>(null)
  // Escape para salir y el foco en el primer campo al abrir. El hook lleva
  // una pila, asi que con modales anidados Escape cierra solo el de encima.
  useModalDialog({
    onClose: onClose,
  })

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
        <Tooltip texto="Cerrar">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-white transition-all"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </Tooltip>

        <div className="flex-1 overflow-y-auto sm:rounded-2xl p-6">
          {loading ? (
            <div className="space-y-6" aria-busy="true">
              <span className="sr-only">Cargando detalle del artículo…</span>
              <div className="flex items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
              <SkeletonTexto lineas={3} />
              <SkeletonTabla filas={4} columnas={3} />
            </div>
          ) : producto ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
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
