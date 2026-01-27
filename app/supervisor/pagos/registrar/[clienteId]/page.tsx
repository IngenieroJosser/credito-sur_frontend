'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Package,
  ShoppingBag,
  User,
  Wallet,
} from 'lucide-react'
import { cn, formatCOPInputValue, formatCurrency, parseCOPInputToNumber } from '@/lib/utils'

type TipoProducto = 'PRESTAMO_EFECTIVO' | 'CREDITO_ARTICULO'

interface Cliente {
  id: string
  nombre: string
  dni: string
  direccion: string
}

interface ProductoFinanciero {
  id: string
  tipo: TipoProducto
  codigo: string
  descripcion: string
  saldoPendiente: number
  proximaCuota: string
  valorCuota: number
  diasMora: number
  imagen?: string
}

export default function RegistrarPagoClienteSupervisorPage() {
  const params = useParams()
  const router = useRouter()
  const clienteId = params?.clienteId as string

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [producto, setProducto] = useState<ProductoFinanciero | null>(null)

  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [estadoEnvio, setEstadoEnvio] = useState<'idle' | 'enviando' | 'exito' | 'error'>('idle')

  useEffect(() => {
    const loadData = () => {
      setLoading(true)
      setTimeout(() => {
        setCliente({
          id: clienteId,
          nombre: clienteId === '2' ? 'Juan Taller Motos' : 'Maria Tienda Esquina',
          dni: '1.023.456.789',
          direccion: 'Calle Principal #123',
        })

        if (clienteId === '2') {
          setProducto({
            id: 'cred-001',
            tipo: 'CREDITO_ARTICULO',
            codigo: 'ART-2024-885',
            descripcion: 'Moto Bera SBR 2024',
            saldoPendiente: 3500000,
            proximaCuota: '2024-02-15',
            valorCuota: 150000,
            diasMora: 2,
            imagen: 'moto',
          })
        } else {
          setProducto({
            id: 'prest-001',
            tipo: 'PRESTAMO_EFECTIVO',
            codigo: 'PR-2024-125',
            descripcion: 'Préstamo',
            saldoPendiente: 450000,
            proximaCuota: '2024-02-10',
            valorCuota: 50000,
            diasMora: 0,
          })
        }

        setLoading(false)
      }, 500)
    }

    if (clienteId) loadData()
  }, [clienteId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (parseCOPInputToNumber(monto) <= 0) return

    setEstadoEnvio('enviando')
    setTimeout(() => {
      setEstadoEnvio('exito')
      setTimeout(() => {
        router.back()
      }, 1500)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!cliente || !producto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-md text-center">
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No se pudo cargar</h2>
          <p className="text-sm text-slate-500 mb-6">No se encontró información para registrar el pago.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
      </div>
    )
  }

  const iconProducto = producto.tipo === 'CREDITO_ARTICULO' ? <Package className="h-5 w-5" /> : <Wallet className="h-5 w-5" />

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-600 opacity-10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700 tracking-wide font-bold border border-blue-100 mb-2">
              <Banknote className="h-3.5 w-3.5" />
              <span>Registrar Pago</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Pago de </span>
              <span className="text-orange-500">Cliente</span>
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="text-sm text-slate-500 font-medium">Cliente</div>
                <div className="text-lg font-bold text-slate-900">{cliente.nombre}</div>
                <div className="text-xs text-slate-500 font-mono">{cliente.dni}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase">Dirección</span>
                <span className="text-sm font-medium text-slate-900">{cliente.direccion}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">{iconProducto}</div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase">Producto</div>
                  <div className="text-lg font-bold text-slate-900">{producto.descripcion}</div>
                  <div className="text-xs text-slate-500 font-mono">{producto.codigo}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-bold uppercase">Saldo pendiente</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(producto.saldoPendiente)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="text-xs font-bold text-slate-500 uppercase">Próxima cuota</div>
                <div className="mt-1 font-bold text-slate-900">{producto.proximaCuota}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="text-xs font-bold text-slate-500 uppercase">Valor cuota</div>
                <div className="mt-1 font-bold text-slate-900">{formatCurrency(producto.valorCuota)}</div>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="text-xs font-bold text-slate-500 uppercase">Días mora</div>
                <div className={cn('mt-1 font-bold', producto.diasMora > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                  {producto.diasMora}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monto a registrar</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      value={monto}
                      onChange={(e) => setMonto(formatCOPInputValue(e.target.value))}
                      placeholder="$ 0"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white shadow-sm text-sm font-medium text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Método</label>
                  <div className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-slate-400" />
                    Efectivo
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comentarios</label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Observaciones del pago..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white shadow-sm text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={estadoEnvio === 'enviando' || parseCOPInputToNumber(monto) <= 0}
                  className={cn(
                    'px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg',
                    estadoEnvio === 'exito'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                      : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700',
                    (estadoEnvio === 'enviando' || parseCOPInputToNumber(monto) <= 0) && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {estadoEnvio === 'enviando'
                    ? 'Registrando...'
                    : estadoEnvio === 'exito'
                      ? 'Registrado'
                      : 'Registrar pago'}
                </button>
              </div>

              {estadoEnvio === 'exito' && (
                <div className="mt-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-bold text-emerald-800">Pago registrado</div>
                    <div className="text-xs text-emerald-700 font-medium">Se redirigirá automáticamente.</div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
