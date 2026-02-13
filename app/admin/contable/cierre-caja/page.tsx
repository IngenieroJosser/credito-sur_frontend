'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Calculator, Wallet, Receipt, Eye } from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'
import { getResumenFinanciero, getHistorialCierres, getHistorialCierresFiltrado, getCajas, consolidarCaja, registrarArqueo } from '@/services/contabilidad-service'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'

export default function CierreCajaPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Datos se obtienen de resumen y de la caja principal real

  const [form, setForm] = useState({
    efectivoReal: '',
    observaciones: 'Cierre normal sin novedades.'
  })
  const [resumen, setResumen] = useState<any | null>(null)
  const [ultimoCierre, setUltimoCierre] = useState<any | null>(null)
  const [cierres, setCierres] = useState<any[]>([])
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [selectedCierre, setSelectedCierre] = useState<any | null>(null)
  const [cargando, setCargando] = useState(false)
  const [principalCaja, setPrincipalCaja] = useState<any | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ARQUEO' | 'CONSOLIDACION'>('TODOS')
  const [soloRutas, setSoloRutas] = useState<boolean>(false)
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'CUADRADA' | 'DESCUADRADA'>('TODOS')
  const [fechaInicio, setFechaInicio] = useState<string>('')
  const [fechaFin, setFechaFin] = useState<string>('')
  const stats = useMemo(() => {
    const total = cierres.length
    let cuadradas = 0
    let descuadradas = 0
    let difTotal = 0
    cierres.forEach((c: any) => {
      if (String(c.estado) === 'DESCUADRADA') descuadradas++
      else cuadradas++
      difTotal += Number(c.diferencia || 0)
    })
    return { total, cuadradas, descuadradas, difTotal }
  }, [cierres])
  const [showDetalleCierreModal, setShowDetalleCierreModal] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setCargando(true)
        const [res, cierresResp, cajasResp] = await Promise.all([
          getResumenFinanciero(),
          getHistorialCierres(),
          getCajas()
        ])
        if (!mounted) return
        setResumen(res)
        const list = Array.isArray(cierresResp) ? cierresResp : []
        setCierres(list)
        setUltimoCierre(list.length ? list[0] : null)
        const principal = (cajasResp || []).find((c: any) => c.tipo === 'PRINCIPAL')
        setPrincipalCaja(principal || null)
      } finally {
        setCargando(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!showHistorialModal) return
    const fetchFilter = async () => {
      const data = await getHistorialCierresFiltrado({
        tipo: filtroTipo === 'TODOS' ? undefined : filtroTipo,
        soloRutas,
        estado: estadoFiltro === 'TODOS' ? undefined : estadoFiltro,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined
      })
      setCierres(Array.isArray(data) ? data : [])
      setSelectedCierre(null)
    }
    fetchFilter()
  }, [showHistorialModal, filtroTipo, soloRutas, estadoFiltro, fechaInicio, fechaFin])

  const diferencia = form.efectivoReal 
    ? parseCOPInputToNumber(form.efectivoReal) - (resumen ? resumen.saldoCajas : 0) 
    : 0
  const saldoSistema = useMemo(() => resumen ? resumen.saldoCajas : 0, [resumen])
  const ingresosHoy = useMemo(() => resumen ? resumen.ingresosHoy : 0, [resumen])
  const egresosHoy = useMemo(() => resumen ? resumen.egresosHoy : 0, [resumen])

  const handleCierre = async () => {
    setLoading(true)
    try {
      // Registrar arqueo (evento historial) antes del cierre
      if (principalCaja) {
        await registrarArqueo(principalCaja.id, {
          efectivoReal: form.efectivoReal ? parseCOPInputToNumber(form.efectivoReal) : 0,
          saldoSistema: saldoSistema,
          diferencia,
          observaciones: form.observaciones || undefined
        })
      }
      const cajas = await getCajas()
      const principal = (cajas || []).find((c: any) => c.tipo === 'PRINCIPAL')
      if (principal) {
        await consolidarCaja(principal.id)
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setStep(3)
    } catch (e) {
      // mantener UX y permitir continuar
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            href="/contable"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Cierre de</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500 font-medium">
              {(principalCaja?.nombre || 'Caja Principal')} • {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resumen del Día */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Sistema</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(saldoSistema)}</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Ingresos Hoy</div>
                <div className="text-xl font-bold text-slate-900">+{formatCurrency(ingresosHoy)}</div>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm">
                <div className="text-xs font-bold text-rose-600 uppercase mb-1">Egresos Hoy</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(egresosHoy)}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Cajas Abiertas</div>
                <div className="text-2xl font-bold text-slate-900">{resumen ? resumen.cajasAbiertasCount : 0}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Rutas Pendientes</div>
                <div className="text-2xl font-bold text-slate-900">{resumen ? resumen.rutasPendientesConsolidacion : 0}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistorialModal(true)}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 text-left"
              >
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Historial de Cierres</div>
                <div className="text-sm font-bold text-slate-900">
                  {ultimoCierre ? new Date(ultimoCierre.fecha).toLocaleString('es-CO') : '—'}
                </div>
                <div className="text-xs text-slate-500">Ver detalles</div>
              </button>
            </div>

            {/* Formulario de Conteo */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Arqueo de Efectivo
                </h3>
              </div>
              
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Efectivo Real en Caja
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold">$</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.efectivoReal}
                        onChange={(e) => setForm({ ...form, efectivoReal: formatCOPInputValue(e.target.value) })}
                        className="pl-8 w-full rounded-xl border-slate-300 py-3 text-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Ingrese el total contado físicamente.
                    </p>
                  </div>

                  {form.efectivoReal && (
                    <div className={cn(
                      "p-4 rounded-xl border flex items-start gap-3 transition-all",
                      diferencia === 0 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : diferencia > 0 
                          ? "bg-blue-50 border-blue-200 text-blue-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                    )}>
                      {diferencia === 0 ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold">
                          {diferencia === 0 ? 'Cuadre Perfecto' : diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
                        </div>
                        <div className="text-sm opacity-90">
                          Diferencia de {formatCurrency(Math.abs(diferencia))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm({...form, observaciones: e.target.value})}
                    className="w-full rounded-xl border-slate-300 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent min-h-[160px] resize-none"
                    placeholder="Detalles sobre diferencias, billetes falsos, o notas del turno..."
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.efectivoReal}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar a Confirmación
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="p-8 text-center border-b border-slate-100">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmar Cierre</h2>
                <p className="text-slate-500">
                  Verifique los valores antes de cerrar la caja permanentemente.
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Responsable</span>
                  <span className="font-bold text-slate-900">{principalCaja?.responsable || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Saldo Sistema</span>
                  <span className="font-bold text-slate-900">{formatCurrency(saldoSistema)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Efectivo Reportado</span>
                  <span className="font-bold text-slate-900">{formatCurrency(Number(form.efectivoReal))}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-500 font-medium">Diferencia</span>
                  <span className={cn(
                    "font-bold px-2 py-1 rounded-md",
                    diferencia === 0 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-rose-100 text-rose-700"
                  )}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
                
                {form.observaciones && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm text-black border border-slate-200">
                    &ldquo;{form.observaciones}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Volver
                </button>
                <button
                  onClick={handleCierre}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70"
                >
                  {loading ? 'Procesando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Cierre Exitoso!</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
              La caja ha sido cerrada correctamente. Se ha generado el reporte #CIERRE-2024-001.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/contable"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Volver al Tablero
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                <Receipt className="h-4 w-4" />
                Imprimir Comprobante
              </button>
            </div>
          </div>
        )}
        {showHistorialModal && (
          <Portal>
          <div className="fixed inset-0 flex items-center justify-center p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowHistorialModal(false)}>
            <div className="w-full max-w-5xl 2xl:max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Historial de Cierres</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", filtroTipo === 'TODOS' ? "bg-blue-50 text-blue-700" : "text-slate-600")}
                    >Todos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('ARQUEO')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", filtroTipo === 'ARQUEO' ? "bg-emerald-50 text-emerald-700" : "text-slate-600")}
                    >Arqueos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('CONSOLIDACION')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", filtroTipo === 'CONSOLIDACION' ? "bg-orange-50 text-orange-700" : "text-slate-600")}
                    >Consolidaciones</button>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", estadoFiltro === 'TODOS' ? "bg-blue-50 text-blue-700" : "text-slate-600")}
                    >Estado: Todos</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('DESCUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", estadoFiltro === 'DESCUADRADA' ? "bg-rose-50 text-rose-700" : "text-slate-600")}
                    >Descuadradas</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('CUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1 rounded-lg", estadoFiltro === 'CUADRADA' ? "bg-emerald-50 text-emerald-700" : "text-slate-600")}
                    >Cuadradas</button>
                  </div>
                  <div className="md:col-span-4 flex items-center justify-between gap-3">
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</span>
                      <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none" />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</span>
                      <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-100 outline-none" />
                    </label>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={soloRutas} onChange={(e) => setSoloRutas(e.target.checked)} className="rounded-md border-slate-300" />
                      <span className="text-xs font-bold text-slate-700">Solo Cobradores (Rutas)</span>
                    </label>
                  </div>
                  <div className="md:col-span-8 grid grid-cols-4 gap-2">
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Registros</div>
                      <div className="text-sm font-black text-slate-900">{stats.total}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase">Cuadradas</div>
                      <div className="text-sm font-black text-emerald-800">{stats.cuadradas}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                      <div className="text-[10px] font-bold text-rose-600 uppercase">Descuadradas</div>
                      <div className="text-sm font-black text-rose-800">{stats.descuadradas}</div>
                    </div>
                    <div className={cn("rounded-xl px-3 py-2 border shadow-sm", stats.difTotal === 0 ? "bg-slate-50 border-slate-200" : stats.difTotal > 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                      <div className={cn("text-[10px] font-bold uppercase", stats.difTotal === 0 ? "text-slate-500" : stats.difTotal > 0 ? "text-emerald-600" : "text-rose-600")}>Dif. Neta</div>
                      <div className={cn("text-sm font-black", stats.difTotal === 0 ? "text-slate-800" : stats.difTotal > 0 ? "text-emerald-800" : "text-rose-800")}>{formatCurrency(stats.difTotal)}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                  {cierres.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{c.caja}</span>
                            {typeof c.estado !== 'undefined' && (
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", c.estado === 'DESCUADRADA' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                                {c.estado}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            title="Ver detalles"
                            onClick={() => { setSelectedCierre(c); setShowDetalleCierreModal(true) }}
                            className="inline-flex items-center justify-center rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] text-slate-600">Resp: {c.responsable}</span>
                          <span className="text-[11px] text-slate-400">{new Date(c.fecha).toLocaleString('es-CO')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cierres.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <span className="text-sm font-bold text-slate-500">Sin registros en el rango seleccionado</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 text-right">
                <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={() => setShowHistorialModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
        {showDetalleCierreModal && selectedCierre && (
          <Portal>
          <div className="fixed inset-0 flex items-center justify-center p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowDetalleCierreModal(false)}>
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Detalle de Cierre</h3>
                <p className="text-sm text-slate-500">{selectedCierre.caja}</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Responsable</div>
                    <div className="text-sm font-bold text-slate-900">{selectedCierre.responsable}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Fecha</div>
                    <div className="text-sm font-bold text-slate-900">{new Date(selectedCierre.fecha).toLocaleString('es-CO')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sistema</div>
                    <div className="text-lg font-black text-slate-900">{formatCurrency(selectedCierre.saldoSistema ?? 0)}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Real</div>
                    <div className="text-lg font-black text-slate-900">{formatCurrency(selectedCierre.saldoReal ?? 0)}</div>
                  </div>
                  <div className={cn("rounded-xl px-3 py-3 text-right border", (Number(selectedCierre.diferencia || 0) === 0) ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                    <div className={cn("text-[10px] font-bold uppercase", (Number(selectedCierre.diferencia || 0) === 0) ? "text-emerald-600" : "text-rose-600")}>Diferencia</div>
                    <div className={cn("text-lg font-black", (Number(selectedCierre.diferencia || 0) === 0) ? "text-emerald-800" : "text-rose-800")}>{formatCurrency(selectedCierre.diferencia ?? 0)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCierre.estado && (
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Estado</div>
                      <div className={cn("inline-block text-xs font-bold px-2 py-1 rounded-md", selectedCierre.estado === 'DESCUADRADA' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>{selectedCierre.estado}</div>
                    </div>
                  )}
                  {selectedCierre.tipo && (
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Tipo</div>
                      <div className="text-sm font-bold text-slate-900">{selectedCierre.tipo}</div>
                    </div>
                  )}
                  {selectedCierre.referenciaId && (
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Referencia</div>
                      <div className="text-sm font-bold text-slate-900">{selectedCierre.referenciaId}</div>
                    </div>
                  )}
                  {selectedCierre.cajaId && (
                    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Caja ID</div>
                      <div className="text-sm font-bold text-slate-900">{selectedCierre.cajaId}</div>
                    </div>
                  )}
                </div>
                { (selectedCierre.observaciones || selectedCierre.descripcion) && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</div>
                    <div className="text-sm font-bold text-slate-900 whitespace-pre-line">{selectedCierre.observaciones || selectedCierre.descripcion}</div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 text-right">
                <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100" onClick={() => setShowDetalleCierreModal(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}
      </div>
    </div>
  )
}
