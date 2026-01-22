'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  User,
  CreditCard,
  Wallet,
  Calendar,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  Banknote,
  Package,
  CheckCircle2
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'

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
  descripcion: string // "Préstamo Personal" o "Televisor Samsung 55'"
  saldoPendiente: number
  proximaCuota: string
  valorCuota: number
  diasMora: number
  imagen?: string // Para artículos
}

const RegistrarPagoClientePage = () => {
  const params = useParams()
  const router = useRouter()
  const clienteId = params?.clienteId as string

  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [producto, setProducto] = useState<ProductoFinanciero | null>(null)

  // Form states
  const [monto, setMonto] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [estadoEnvio, setEstadoEnvio] = useState<'idle' | 'enviando' | 'exito' | 'error'>('idle')

  // Mock Data Loading
  useEffect(() => {
    // Simular carga de datos según ID
    const loadData = () => {
      setLoading(true)
      setTimeout(() => {
        // Datos básicos del cliente
        setCliente({
          id: clienteId,
          nombre: clienteId === '2' ? 'Juan Taller Motos' : 'Maria Tienda Esquina',
          dni: '1.023.456.789',
          direccion: 'Calle Principal #123'
        })

        // Simular diferentes productos según el ID del cliente
        if (clienteId === '2') {
          // Caso: Crédito de Artículo
          setProducto({
            id: 'cred-001',
            tipo: 'CREDITO_ARTICULO',
            codigo: 'ART-2024-885',
            descripcion: 'Moto Bera SBR 2024',
            saldoPendiente: 3500000,
            proximaCuota: '2024-02-15',
            valorCuota: 150000,
            diasMora: 2,
            imagen: 'moto'
          })
        } else {
          // Caso: Préstamo Efectivo (Default)
          setProducto({
            id: 'prest-001',
            tipo: 'PRESTAMO_EFECTIVO',
            codigo: 'PR-2024-125',
            descripcion: 'Préstamo',
            saldoPendiente: 450000,
            proximaCuota: '2024-02-10',
            valorCuota: 50000,
            diasMora: 0
          })
        }
        setLoading(false)
      }, 500)
    }

    if (clienteId) loadData()
  }, [clienteId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!monto) return

    setEstadoEnvio('enviando')
    setTimeout(() => {
      setEstadoEnvio('exito')
      // Redirigir después de un momento
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

  // VISTA DIFERENCIADA PARA ARTÍCULOS
  if (producto?.tipo === 'CREDITO_ARTICULO') {
    return (
      <div className="min-h-screen bg-slate-50 relative pb-10">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="relative z-10 w-full p-8 space-y-8">
          {/* Header Artículo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Pago de <span className="text-orange-500">Artículo</span>
              </h1>
              <p className="text-slate-600 text-sm font-medium">
                Crédito por {producto.descripcion}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Columna Izquierda: Detalles del Artículo (Más visual) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden relative group">
                {/* Placeholder de imagen de producto */}
                <div className="aspect-square rounded-2xl bg-slate-100 mb-6 flex items-center justify-center relative overflow-hidden">
                   <Package className="h-32 w-32 text-slate-300" />
                   {/* Badge de estado */}
                   <div className="absolute top-4 right-4">
                     <span className="px-3 py-1 bg-white/90 backdrop-blur text-slate-900 text-xs font-bold rounded-full border border-slate-200 shadow-sm">
                       {producto.codigo}
                     </span>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{producto.descripcion}</h3>
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                       <User className="h-4 w-4" />
                       {cliente?.nombre}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100">
                    <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Total</p>
                       <p className="text-xl font-bold text-slate-900">{formatCurrency(producto.saldoPendiente)}</p>
                    </div>
                    <div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Cuota</p>
                       <p className="text-xl font-bold text-blue-600">{formatCurrency(producto.valorCuota)}</p>
                    </div>
                  </div>

                  {producto.diasMora > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-full text-rose-600 shadow-sm">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-rose-700">Cuenta en Mora</p>
                        <p className="text-xs text-rose-600">Este cliente tiene {producto.diasMora} días de retraso.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Formulario de Pago */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 h-full">
                <form onSubmit={handleSubmit} className="space-y-8 h-full flex flex-col justify-center">
                   <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-emerald-600" />
                        Registrar Abono
                      </h3>
                      
                      {/* Input Gigante */}
                      <div className="relative mb-8">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto a abonar</label>
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-light text-slate-300">$</span>
                          <input
                            type="number"
                            value={monto}
                            onChange={(e) => setMonto(e.target.value)}
                            placeholder="0"
                            className="w-full pl-8 pr-4 py-2 bg-transparent border-b-2 border-slate-200 text-5xl font-bold text-slate-900 focus:border-blue-600 focus:ring-0 outline-none transition-all placeholder:text-slate-200"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Botones rápidos */}
                      <div className="grid grid-cols-3 gap-3 mb-8">
                        {[producto.valorCuota, producto.valorCuota * 2, producto.saldoPendiente].map((val, idx) => (
                           val && (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setMonto(val.toString())}
                              className="py-3 px-4 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-bold text-sm transition-all"
                            >
                              {idx === 2 ? 'Pago Total' : formatCurrency(val)}
                            </button>
                           )
                        ))}
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas adicionales</label>
                         <textarea 
                            value={comentarios}
                            onChange={(e) => setComentarios(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
                            rows={3}
                            placeholder="Agregar comentario sobre el estado del artículo o pago..."
                          />
                      </div>
                   </div>

                   <div className="pt-4">
                      <button
                        type="submit"
                        disabled={!monto || estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
                        className={cn(
                          "w-full py-5 rounded-2xl font-bold text-lg text-white transition-all transform active:scale-[0.99] shadow-lg hover:shadow-xl",
                          estadoEnvio === 'exito' 
                            ? "bg-emerald-500 shadow-emerald-500/30"
                            : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                        )}
                      >
                        {estadoEnvio === 'enviando' ? 'Procesando...' : estadoEnvio === 'exito' ? '¡Pago Exitoso!' : 'Confirmar Pago de Artículo'}
                      </button>
                   </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // VISTA DEFAULT (PRÉSTAMOS)
  return (
    <div className="min-h-screen bg-slate-50 relative pb-10">
      {/* Fondo decorativo */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header con botón de regreso */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Registrar</span> <span className="text-orange-500">Pago</span>
            </h1>
            <p className="text-slate-600 text-sm font-medium">
              {producto?.tipo === 'CREDITO_ARTICULO' ? 'Abono a Crédito de Artículo' : 'Abono a Préstamo Personal'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información */}
          <div className="space-y-6">
            {/* Tarjeta Cliente */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{cliente?.nombre}</h3>
                  <p className="text-xs text-slate-500">ID: {cliente?.dni}</p>
                </div>
              </div>
              <div className="text-sm text-slate-600 flex items-start gap-2">
                <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div>
                {cliente?.direccion}
              </div>
            </div>

            {/* Tarjeta Producto */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    producto?.tipo === 'CREDITO_ARTICULO' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {producto?.tipo === 'CREDITO_ARTICULO' ? <ShoppingBag className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-bold",
                      producto?.tipo === 'CREDITO_ARTICULO' ? "text-indigo-900" : "text-emerald-900"
                    )}>
                      {producto?.tipo === 'CREDITO_ARTICULO' ? 'Crédito Artículo' : 'Préstamo Efectivo'}
                    </h3>
                    <p className={cn(
                      "text-xs font-medium",
                      producto?.tipo === 'CREDITO_ARTICULO' ? "text-indigo-600" : "text-emerald-600"
                    )}>
                      {producto?.codigo}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Producto / Detalle</p>
                  <p className="font-bold text-lg leading-tight text-slate-900">{producto?.descripcion}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Saldo Pendiente</p>
                    <p className="font-bold text-slate-900">{formatCurrency(producto?.saldoPendiente || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-1">Valor Cuota</p>
                    <p className="font-bold text-slate-900">{formatCurrency(producto?.valorCuota || 0)}</p>
                  </div>
                </div>

                {producto?.diasMora && producto.diasMora > 0 ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                    <AlertCircle className="h-3 w-3" />
                    {producto.diasMora} días en mora
                  </div>
                ) : null}
              </div>

              {/* Decoración de fondo */}
              <div className="absolute -right-4 -bottom-4 opacity-10">
                {producto?.tipo === 'CREDITO_ARTICULO' ? <Package className="h-32 w-32" /> : <CreditCard className="h-32 w-32" />}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Selección de Método */}
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Método de Pago</label>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-slate-900 bg-slate-50 text-slate-900"
                    >
                      <div className="p-2 bg-slate-900 rounded-full text-white">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">Efectivo</p>
                        <p className="text-xs text-slate-600 font-medium">Pago directo al cobrador</p>
                      </div>
                      <div className="ml-auto">
                        <div className="h-5 w-5 rounded-full border-2 border-slate-900 bg-slate-900 flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full" />
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Input Monto */}
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-3 block">Monto a Pagar</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-light text-xl">$</div>
                      <input
                        type="number"
                        value={monto}
                        onChange={(e) => setMonto(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                        autoFocus
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                        COP
                      </div>
                    </div>
                    {/* Accesos rápidos */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {[producto?.valorCuota, (producto?.valorCuota || 0) * 2, (producto?.saldoPendiente || 0)].map((val) => (
                         val && (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setMonto(val.toString())}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
                          >
                            {formatCurrency(val)}
                          </button>
                         )
                      ))}
                    </div>
                  </div>

                  {/* Comentarios */}
                  <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Notas (Opcional)</label>
                    <textarea 
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                      rows={3}
                      placeholder="Ej: Cliente solicitó reprogramación de próxima cuota..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!monto || estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98]",
                      estadoEnvio === 'exito' 
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                    )}
                  >
                    {estadoEnvio === 'enviando' ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : estadoEnvio === 'exito' ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        ¡Pago Registrado!
                      </span>
                    ) : (
                      "Confirmar Pago"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrarPagoClientePage