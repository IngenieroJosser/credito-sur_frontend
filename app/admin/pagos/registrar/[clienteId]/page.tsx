'use client'

import PantallaCarga from '@/components/ui/PantallaCarga'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  User,
  CreditCard,
  Wallet,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  Banknote,
  Package,
  CheckCircle2
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, formatMilesCOP, parseCOPInputToNumber, cn } from '@/lib/utils'
import { clientesService } from '@/services/cliente-service'
import { prestamosService } from '@/services/prestamos-service'
import { pagosService, type DescomposicionPago } from '@/services/pagos-service'
import { offlineStore } from '@/lib/offline/offlineDb'
import { enqueuePago } from '@/lib/offline/offlineQueue'
import { resolveCobradorIdForRouteAction } from '@/lib/rutas-core'

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
  cobradorId?: string
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
  const [descomposicion, setDescomposicion] = useState<DescomposicionPago | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const clienteData = await clientesService.obtenerPorId(clienteId)
        setCliente({
          id: clienteData.id,
          nombre: `${clienteData.nombres} ${clienteData.apellidos}`,
          dni: clienteData.dni || (clienteData as any).cedula || '',
          direccion: clienteData.direccion || ''
        })

        const prestamosResp = await prestamosService.obtenerPrestamos({ search: clienteId, limit: 1 })
        const prestamo = prestamosResp?.prestamos?.[0]
        if (prestamo) {
          const tipoPrestamoRaw = prestamo.tipoPrestamo || prestamo.producto || ''
          const tipoPrestamo: string = typeof tipoPrestamoRaw === 'string' ? tipoPrestamoRaw : (tipoPrestamoRaw as any)?.nombre || ''
          const esArticulo = tipoPrestamo.toLowerCase() !== 'efectivo' && tipoPrestamo.toLowerCase() !== 'préstamo'
          setProducto({
            id: prestamo.id,
            tipo: esArticulo ? 'CREDITO_ARTICULO' : 'PRESTAMO_EFECTIVO',
            codigo: prestamo.numeroPrestamo || prestamo.id,
            descripcion: tipoPrestamo || 'Préstamo',
            saldoPendiente: Number(prestamo.montoPendiente) || prestamo.saldoPendiente || 0,
            proximaCuota: prestamo.proximoPago || prestamo.fechaFin || '',
            valorCuota: prestamo.valorCuota || 0,
            diasMora: prestamo.diasMora || 0,
            cobradorId: prestamo.cobradorId || undefined,
          })
        }
      } catch (err) {
        console.error('Error cargando datos del cliente:', err)
        // Fallback offline: cargar de IndexedDB
        try {
          const offCliente = await offlineStore.getById<any>('clientes', clienteId)
          if (offCliente) {
            setCliente({
              id: offCliente.id,
              nombre: `${offCliente.nombres || ''} ${offCliente.apellidos || ''}`.trim(),
              dni: offCliente.dni || '',
              direccion: offCliente.direccion || ''
            })
          }
          const offPrestamos = await offlineStore.getByIndex<any>('prestamos', 'by-clienteId', clienteId)
          const offPrestamo = offPrestamos[0]
          if (offPrestamo) {
            setProducto({
              id: offPrestamo.id,
              tipo: 'PRESTAMO_EFECTIVO',
              codigo: offPrestamo.numeroPrestamo || offPrestamo.id,
              descripcion: offPrestamo.frecuenciaPago || 'Préstamo',
              saldoPendiente: offPrestamo.saldoPendiente || 0,
              proximaCuota: offPrestamo.fechaFin || '',
              valorCuota: offPrestamo.saldoPendiente ? Math.round(offPrestamo.saldoPendiente / (offPrestamo.cantidadCuotas || 1)) : 0,
              diasMora: 0,
              cobradorId: offPrestamo.cobradorId || undefined,
            })
          }
        } catch { /* ignore */ }
      } finally {
        setLoading(false)
      }
    }

    if (clienteId) loadData()
  }, [clienteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parseCOPInputToNumber(monto) <= 0 || !producto || !cliente) return

    setEstadoEnvio('enviando')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    const cobradorId = resolveCobradorIdForRouteAction(producto.cobradorId, user?.id)

    try {
      const resultado = await pagosService.registrarPago({
        clienteId: cliente.id,
        prestamoId: producto.id,
        cobradorId,
        montoTotal: parseCOPInputToNumber(monto),
        metodoPago: 'EFECTIVO' as any,
        notas: comentarios || undefined,
      })
      setDescomposicion(resultado.descomposicion)
      setEstadoEnvio('exito')
    } catch (err) {
      console.error('Error registrando pago:', err)
      // Fallback offline: encolar pago
      if (!navigator.onLine) {
        try {
          await enqueuePago({
            clienteId: cliente.id,
            prestamoId: producto.id,
            cobradorId,
            montoTotal: parseCOPInputToNumber(monto),
            notas: comentarios || undefined,
            clienteNombre: cliente.nombre,
          })
          setEstadoEnvio('exito')
          setDescomposicion({
            montoTotal: parseCOPInputToNumber(monto),
            capitalRecuperado: 0,
            interesRecuperado: 0,
            saldoAnterior: producto.saldoPendiente,
            saldoNuevo: producto.saldoPendiente - parseCOPInputToNumber(monto),
            cuotasAfectadas: 0,
            prestamoQuedaPagado: false,
          })
          return
        } catch { /* ignore */ }
      }
      setEstadoEnvio('error')
    }
  }

  if (loading) {
    return (
      <PantallaCarga />
    )
  }

  const esCreditoArticulo = producto?.tipo === 'CREDITO_ARTICULO'

  // VISTA DIFERENCIADA PARA ARTÍCULOS
  if (esCreditoArticulo) {
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
                            type="text"
                            inputMode="numeric"
                            value={monto}
                            onChange={(e) => setMonto(formatCOPInputValue(e.target.value))}
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
                              onClick={() => setMonto(formatMilesCOP(val))}
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
                        disabled={parseCOPInputToNumber(monto) <= 0 || estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
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

                   {estadoEnvio === 'exito' && descomposicion && (
                     <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                       <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                         <CheckCircle2 className="h-5 w-5" />
                         Resumen del Pago
                       </h4>
                       <div className="grid grid-cols-2 gap-3 text-sm">
                         <div>
                           <p className="text-emerald-600 font-medium">Capital Recuperado</p>
                           <p className="text-lg font-bold text-slate-900">{formatCurrency(descomposicion.capitalRecuperado)}</p>
                         </div>
                         <div>
                           <p className="text-emerald-600 font-medium">Interés Recuperado</p>
                           <p className="text-lg font-bold text-slate-900">{formatCurrency(descomposicion.interesRecuperado)}</p>
                         </div>
                         <div>
                           <p className="text-emerald-600 font-medium">Saldo Anterior</p>
                           <p className="font-bold text-slate-700">{formatCurrency(descomposicion.saldoAnterior)}</p>
                         </div>
                         <div>
                           <p className="text-emerald-600 font-medium">Nuevo Saldo</p>
                           <p className="font-bold text-slate-900">{formatCurrency(descomposicion.saldoNuevo)}</p>
                         </div>
                       </div>
                       {descomposicion.prestamoQuedaPagado && (
                         <div className="mt-2 text-center py-2 bg-emerald-100 rounded-xl text-emerald-800 font-bold text-sm">
                           Préstamo pagado en su totalidad
                         </div>
                       )}
                       <button
                         type="button"
                         onClick={() => router.back()}
                         className="w-full mt-2 py-3 rounded-xl border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors"
                       >
                         Volver
                       </button>
                     </div>
                   )}
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
              {esCreditoArticulo ? 'Abono a Crédito de Artículo' : 'Abono a Préstamo Personal'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Columna Izquierda: Información */}
          <div className="space-y-6">
            {/* Tarjeta Cliente */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="shrink-0 p-2 bg-slate-100 rounded-lg">
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
                    esCreditoArticulo ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {esCreditoArticulo ? <ShoppingBag className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-bold",
                      esCreditoArticulo ? "text-indigo-900" : "text-emerald-900"
                    )}>
                      {esCreditoArticulo ? 'Crédito Artículo' : 'Préstamo Efectivo'}
                    </h3>
                    <p className={cn(
                      "text-xs font-medium",
                      esCreditoArticulo ? "text-indigo-600" : "text-emerald-600"
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
                {esCreditoArticulo ? <Package className="h-32 w-32" /> : <CreditCard className="h-32 w-32" />}
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
                      <div className="shrink-0 p-2 bg-slate-900 rounded-full text-white">
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
                        type="text"
                        inputMode="numeric"
                        value={monto}
                        onChange={(e) => setMonto(formatCOPInputValue(e.target.value))}
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
                            onClick={() => setMonto(formatMilesCOP(val))}
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
                    disabled={parseCOPInputToNumber(monto) <= 0 || estadoEnvio === 'enviando' || estadoEnvio === 'exito'}
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

                  {estadoEnvio === 'exito' && descomposicion && (
                    <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Resumen del Pago
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-emerald-600 font-medium">Capital Recuperado</p>
                          <p className="text-lg font-bold text-slate-900">{formatCurrency(descomposicion.capitalRecuperado)}</p>
                        </div>
                        <div>
                          <p className="text-emerald-600 font-medium">Interés Recuperado</p>
                          <p className="text-lg font-bold text-slate-900">{formatCurrency(descomposicion.interesRecuperado)}</p>
                        </div>
                        <div>
                          <p className="text-emerald-600 font-medium">Saldo Anterior</p>
                          <p className="font-bold text-slate-700">{formatCurrency(descomposicion.saldoAnterior)}</p>
                        </div>
                        <div>
                          <p className="text-emerald-600 font-medium">Nuevo Saldo</p>
                          <p className="font-bold text-slate-900">{formatCurrency(descomposicion.saldoNuevo)}</p>
                        </div>
                      </div>
                      {descomposicion.prestamoQuedaPagado && (
                        <div className="mt-2 text-center py-2 bg-emerald-100 rounded-xl text-emerald-800 font-bold text-sm">
                          Préstamo pagado en su totalidad
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full mt-2 py-3 rounded-xl border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors"
                      >
                        Volver
                      </button>
                    </div>
                  )}
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
