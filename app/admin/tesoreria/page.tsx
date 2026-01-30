'use client'

import React, { useState } from 'react'
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Wallet,
  X,
  Save,
  Calculator,
  AlertCircle,
  Eye
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'
import { useNotification } from '@/components/providers/NotificationProvider'
import { Clock, Briefcase, History } from 'lucide-react'
import { createPortal } from 'react-dom'


// Mock Data
interface Transaccion {
  id: string
  fecha: string
  concepto: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  metodo: 'EFECTIVO' | 'TRANSFERENCIA'
  responsable: string
  rutaId?: string
}

const TesoreriaPage = () => {
  const { showNotification } = useNotification()
  const [isArqueoOpen, setIsArqueoOpen] = useState(false)
  const [arqueoData, setArqueoData] = useState({
    cajaId: 'CAJA-PRINCIPAL',
    saldoSistema: 15450000,
    conteoFisico: 0,
    observaciones: ''
  })

  const handleArqueoChange = (field: string, value: string | number) => {
    setArqueoData(prev => ({ ...prev, [field]: value }))
  }



  const handleGuardarArqueo = () => {
    setIsArqueoOpen(false)
    showNotification('success', 'El arqueo de caja se ha registrado correctamente', 'Arqueo Exitoso')
  }

  const [showVerMovimientoModal, setShowVerMovimientoModal] = useState(false)
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<Transaccion | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [detalleTipo, setDetalleTipo] = useState<'INGRESOS' | 'EGRESOS' | null>(null)
  const [filtroRuta, setFiltroRuta] = useState('TODOS')

  const rutas = [
    { id: 'RUTA-NORTE', nombre: 'Ruta Norte' },
    { id: 'RUTA-SUR', nombre: 'Ruta Sur' },
    { id: 'RUTA-CENTRO', nombre: 'Ruta Centro' },
  ]

  const diferencia = arqueoData.conteoFisico - arqueoData.saldoSistema

  // Mock Data
  const transacciones: Transaccion[] = [
    {
      id: 'TRX-001',
      fecha: new Date().toISOString(), // Hoy
      concepto: 'Recaudo Ruta Norte - Cierre Parcial',
      tipo: 'INGRESO',
      monto: 1250000,
      metodo: 'EFECTIVO',
      responsable: 'Juan Cobrador',
      rutaId: 'RUTA-NORTE'
    },
    {
      id: 'TRX-002',
      fecha: new Date().toISOString(), // Hoy
      concepto: 'Desembolso Préstamo #452',
      tipo: 'EGRESO',
      monto: 500000,
      metodo: 'TRANSFERENCIA',
      responsable: 'Maria Tesorera'
    },
    {
      id: 'TRX-003',
      fecha: new Date().toISOString(), // Hoy
      concepto: 'Entrega Base Ruta Sur',
      tipo: 'EGRESO',
      monto: 2000000,
      metodo: 'EFECTIVO',
      responsable: 'Maria Tesorera',
      rutaId: 'RUTA-SUR'
    }
  ]

  const transaccionesFiltradas = transacciones.filter(t => {
    const coincideBusqueda = t.concepto.toLowerCase().includes(busqueda.toLowerCase()) || 
                             t.responsable.toLowerCase().includes(busqueda.toLowerCase())
    const coincideRuta = filtroRuta === 'TODOS' || t.rutaId === filtroRuta
    return coincideBusqueda && coincideRuta
  })

  const resumen = {
    saldoTotal: 15450000,
    ingresosHoy: 3500000,
    egresosHoy: 2500000,
    efectivoCaja: 8200000,
    bancos: 7250000
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
              <Landmark className="h-3.5 w-3.5" />
              <span>Control Financiero Central</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="text-blue-600">Tesorería </span>
              <span className="text-orange-500">General</span>
            </h1>
            <p className="text-base text-slate-500 max-w-xl font-medium">
              Centralización de ingresos, egresos y control de efectivo.
            </p>
          </div>

          <div className="flex gap-3">
             <ExportButton label="Reporte" />
             <button 
                onClick={() => setIsArqueoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm transform active:scale-95"
             >
                <Wallet className="h-4 w-4" />
                Arqueo de Caja
             </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Saldo Total Disponible
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black tracking-tight">{formatCurrency(resumen.saldoTotal)}</div>
            <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500">
               <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Efectivo: {formatCurrency(resumen.efectivoCaja)}</span>
               <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> Bancos: {formatCurrency(resumen.bancos)}</span>
            </div>
          </div>

          <div 
            onClick={() => { setDetalleTipo('INGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Ingresos Hoy
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black tracking-tight">{formatCurrency(resumen.ingresosHoy)}</div>
            <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 inline-block px-2 py-1 rounded-full border border-emerald-100">
               +12% vs Ayer
            </div>
          </div>

          <div 
            onClick={() => { setDetalleTipo('EGRESOS'); setShowDetalleModal(true); }}
            className="cursor-pointer bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                Egresos Hoy
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black tracking-tight">{formatCurrency(resumen.egresosHoy)}</div>
            <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 inline-block px-2 py-1 rounded-full border border-rose-100">
               Dentro del presupuesto
            </div>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50">
            <h3 className="font-bold text-slate-900">Movimientos Recientes</h3>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                   <input 
                     type="text" 
                     value={busqueda}
                     onChange={(e) => setBusqueda(e.target.value)}
                     placeholder="Buscar concepto o responsable..." 
                     className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                   />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroRuta('TODOS')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      filtroRuta === 'TODOS' 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    Todas
                  </button>
                  {rutas.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setFiltroRuta(r.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        filtroRuta === r.id 
                          ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                      )}
                    >
                      {r.nombre}
                    </button>
                  ))}
                </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Hora</th>
                  <th className="px-6 py-4">Concepto</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaccionesFiltradas.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          {new Date(trx.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold pl-5 mt-0.5">
                          {new Date(trx.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {trx.concepto}
                      <div className="text-xs font-normal text-slate-500 mt-0.5">{trx.metodo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border",
                        trx.tipo === 'INGRESO' 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {trx.tipo === 'INGRESO' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {trx.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {trx.responsable}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-right font-bold text-lg",
                      trx.tipo === 'INGRESO' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {trx.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(trx.monto)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                            setTransaccionSeleccionada(trx)
                            setShowVerMovimientoModal(true)
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal de Arqueo de Caja */}
      {isArqueoOpen && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsArqueoOpen(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-orange-500" />
                    <span className="text-blue-600">Arqueo de</span>
                    <span className="text-orange-500">Caja</span>
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Registro de cierre y control de efectivo</p>
                </div>
                <button 
                  onClick={() => setIsArqueoOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caja a Arquear</label>
                    <select 
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                      value={arqueoData.cajaId}
                      onChange={(e) => handleArqueoChange('cajaId', e.target.value)}
                    >
                      <option value="CAJA-PRINCIPAL">Caja Principal Oficina</option>
                      <option value="CAJA-MENOR">Caja Menor (Contable)</option>
                      <option value="RUTA-NORTE">Caja Ruta Norte</option>
                      <option value="RUTA-SUR">Caja Ruta Sur</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsable</label>
                    <input 
                      type="text" 
                      value="Administrador Actual" 
                      disabled 
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-900">Saldo en Sistema (Teórico)</span>
                    <span className="text-lg font-bold text-blue-700">{formatCurrency(arqueoData.saldoSistema)}</span>
                  </div>
                  <div className="h-px bg-blue-200/50"></div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="h-3 w-3" />
                      Dinero Físico (Conteo)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-lg font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                        placeholder="0"
                        value={arqueoData.conteoFisico ? formatCOPInputValue(String(arqueoData.conteoFisico)) : ''}
                        onChange={(e) => handleArqueoChange('conteoFisico', parseCOPInputToNumber(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                {diferencia !== 0 && (
                  <div className={cn(
                    "p-4 rounded-xl border flex items-start gap-3",
                    diferencia > 0 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                      : "bg-rose-50 border-rose-100 text-rose-800"
                  )}>
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">
                        {diferencia > 0 ? "Sobrante de Caja Detectado" : "Faltante de Caja Detectado"}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {diferencia > 0 ? "+" : ""}{formatCurrency(diferencia)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
                  <textarea 
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[80px] resize-none transition-all"
                    placeholder="Ingrese detalles sobre billetes, monedas o justificación de diferencias..."
                    value={arqueoData.observaciones}
                    onChange={(e) => handleArqueoChange('observaciones', e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsArqueoOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleGuardarArqueo}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar Arqueo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle Transaccion */}
        {showVerMovimientoModal && transaccionSeleccionada && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Detalle de Transacción</h3>
                    <p className="text-xs font-bold text-slate-500">{transaccionSeleccionada.id}</p>
                </div>
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Fecha y Hora Detallada</div>
                        <div className="font-bold text-slate-900 text-sm">
                            {new Date(transaccionSeleccionada.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            <span className="block text-blue-600">
                                {new Date(transaccionSeleccionada.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Monto</div>
                        <div className="font-bold text-slate-900 text-lg">{formatCurrency(transaccionSeleccionada.monto)}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Tipo</div>
                        <div className={cn(
                            "inline-block px-2 py-1 rounded-xl text-xs font-bold mt-1 border",
                            transaccionSeleccionada.tipo === 'INGRESO' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
                        )}>
                            {transaccionSeleccionada.tipo}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase">Método</div>
                        <div className="font-bold text-slate-900">{transaccionSeleccionada.metodo}</div>
                    </div>
                 </div>
                 
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Concepto</div>
                    <div className="font-medium text-slate-900">{transaccionSeleccionada.concepto}</div>
                 </div>
 
                 <div>
                    <div className="text-xs font-bold text-slate-500 uppercase">Responsable</div>
                    <div className="font-medium text-slate-900">{transaccionSeleccionada.responsable}</div>
                 </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setShowVerMovimientoModal(false)}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle Hoy (Portal) */}
        {showDetalleModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "p-3 rounded-2xl text-white shadow-lg",
                        detalleTipo === 'INGRESOS' ? "bg-emerald-600 shadow-emerald-200" : "bg-rose-600 shadow-rose-200"
                    )}>
                        {detalleTipo === 'INGRESOS' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">
                            {detalleTipo === 'INGRESOS' ? 'Ingresos de Hoy' : 'Egresos de Hoy'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                  onClick={() => setShowDetalleModal(false)}
                  className="p-2.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {transacciones
                    .filter(t => {
                        const esMismoTipo = detalleTipo === 'INGRESOS' ? t.tipo === 'INGRESO' : t.tipo === 'EGRESO';
                        const hoy = new Date().toISOString().split('T')[0];
                        const fechaT = new Date(t.fecha).toISOString().split('T')[0];
                        return esMismoTipo && fechaT === hoy;
                    })
                    .map((t) => (
                      <div key={t.id} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="min-w-[100px] p-2 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 shadow-sm shrink-0">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                    {new Date(t.fecha).toLocaleDateString('es-CO', { weekday: 'short' })}
                                </span>
                                <span className="text-sm font-black text-slate-900">
                                    {new Date(t.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">
                                    {new Date(t.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{t.concepto}</div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">
                                            {t.metodo}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Por {t.responsable}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={cn(
                            "text-lg font-black tabular-nums",
                            detalleTipo === 'INGRESOS' ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {detalleTipo === 'INGRESOS' ? '+' : '-'}{formatCurrency(t.monto)}
                        </div>
                      </div>
                    ))}
                    
                    {transacciones.filter(t => {
                        const esMismoTipo = detalleTipo === 'INGRESOS' ? t.tipo === 'INGRESO' : t.tipo === 'EGRESO';
                        const hoy = new Date().toISOString().split('T')[0];
                        const fechaT = new Date(t.fecha).toISOString().split('T')[0];
                        return esMismoTipo && fechaT === hoy;
                    }).length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                            <History className="w-16 h-16 opacity-20 mb-4" />
                            <p className="font-bold text-slate-400 capitalize">No hay {detalleTipo?.toLowerCase()} registrados hoy</p>
                        </div>
                    )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total {detalleTipo}</span>
                      <span className={cn(
                          "text-2xl font-black",
                          detalleTipo === 'INGRESOS' ? "text-emerald-700" : "text-rose-700"
                      )}>
                        {formatCurrency(
                            transacciones
                            .filter(t => {
                                const esMismoTipo = detalleTipo === 'INGRESOS' ? t.tipo === 'INGRESO' : t.tipo === 'EGRESO';
                                const hoy = new Date().toISOString().split('T')[0];
                                const fechaT = new Date(t.fecha).toISOString().split('T')[0];
                                return esMismoTipo && fechaT === hoy;
                            })
                            .reduce((sum, current) => sum + current.monto, 0)
                        )}
                      </span>
                  </div>
                  <button
                    onClick={() => setShowDetalleModal(false)}
                    className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                  >
                    Entendido
                  </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default TesoreriaPage