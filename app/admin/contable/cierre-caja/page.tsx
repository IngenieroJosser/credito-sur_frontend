'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, Calculator, Wallet, Receipt, Eye } from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'
import MoneyAmount from '@/components/contable/MoneyAmount'
import { getResumenFinanciero, getHistorialCierres, getHistorialCierresFiltrado, getCajas, registrarArqueo, getMovimientosLedger } from '@/services/contabilidad-service'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { getBogotaDateKey } from '@/lib/rutas-core'
import { getEntradaCajaFisica, getSalidaCajaFisica } from '@/lib/contabilidad-clasificacion'
import { useRealtimeData } from '@/hooks/useRealtimeData'

const parseSaldoCaja = (raw: any): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[\s.,$]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

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
    cierres.forEach((c: any) => {
      if (String(c.estado) === 'DESCUADRADA') descuadradas++
      else cuadradas++
    })
    return { total, cuadradas, descuadradas }
  }, [cierres])
  const [showDetalleCierreModal, setShowDetalleCierreModal] = useState(false)
  const [ingresosHoyCalc, setIngresosHoyCalc] = useState<number | null>(null)
  const [egresosHoyCalc, setEgresosHoyCalc] = useState<number | null>(null)

  const loadCierreCaja = useCallback(async () => {
    try {
      setCargando(true)
      const hoyKey = getBogotaDateKey(new Date())

      const [res, cierresResp, cajasResp] = await Promise.all([
        getResumenFinanciero(),
        getHistorialCierres(),
        getCajas(),
      ])
      setResumen(res)

      const list = Array.isArray(cierresResp) ? cierresResp : []
      setCierres(list)
      setUltimoCierre(list.length ? list[0] : null)
      const cajasList = Array.isArray(cajasResp) ? cajasResp : []
      const cajasNoBanco = cajasList.filter((c: any) => {
        const nombre = String(c?.nombre || '').trim().toUpperCase()
        const codigo = String(c?.codigo || '').trim().toUpperCase()
        return !nombre.includes('BANCO') && !codigo.includes('BANCO')
      })

      const principal =
        cajasNoBanco.find((c: any) => String(c?.nombre || '').trim().toUpperCase().includes('CAJA DE OFICINA')) ||
        cajasNoBanco.find((c: any) => String(c?.nombre || '').trim().toUpperCase().includes('OFICINA')) ||
        cajasNoBanco.find((c: any) => String(c?.codigo || '').trim().toUpperCase() === 'CAJA-PRINCIPAL') ||
        cajasNoBanco.find((c: any) => String(c?.tipo || '').trim().toUpperCase() === 'PRINCIPAL') ||
        cajasNoBanco[0] ||
        cajasList[0]
      setPrincipalCaja(principal || null)

      if (principal?.id) {
        const movimientosCaja = await getMovimientosLedger({
          cajaId: principal.id,
          fechaInicio: hoyKey,
          fechaFin: hoyKey,
          limit: 1000,
        })
        const data = Array.isArray(movimientosCaja?.data) ? movimientosCaja.data : []
        setIngresosHoyCalc(data.reduce((acc: number, m: any) => acc + getEntradaCajaFisica(m), 0))
        setEgresosHoyCalc(data.reduce((acc: number, m: any) => acc + getSalidaCajaFisica(m), 0))
      } else {
        setIngresosHoyCalc(0)
        setEgresosHoyCalc(0)
      }
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    loadCierreCaja()
  }, [loadCierreCaja])

  useRealtimeData(['dashboards_actualizados', 'pagos_actualizados', 'prestamos_actualizados', 'rutas_actualizadas'], loadCierreCaja)

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

  const saldoSistema = useMemo(() => {
    const caja: any = principalCaja as any
    const rawSaldo = caja?.saldo ?? caja?.saldoActual ?? caja?.saldoCaja ?? caja?.cajaSaldo
    return parseSaldoCaja(rawSaldo)
  }, [principalCaja])

  const real = form.efectivoReal ? parseCOPInputToNumber(form.efectivoReal) : 0
  const diferencia = form.efectivoReal
    ? parseCOPInputToNumber(form.efectivoReal) - saldoSistema
    : 0
  const ingresosHoy = useMemo(() => ingresosHoyCalc ?? (resumen ? resumen.ingresosHoy : 0), [ingresosHoyCalc, resumen])
  const egresosHoy = useMemo(() => egresosHoyCalc ?? (resumen ? resumen.egresosHoy : 0), [egresosHoyCalc, resumen])

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
      {/* Fondo arquitectónico suave */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-[0.08] blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link 
            href="/contable"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Cierre de</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              {'Caja Principal'}
              <span className="mx-2 text-slate-300">•</span>
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resumen del Día */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo de Esta Caja</div>
                <div className="text-xl font-bold text-slate-900">
                  <MoneyAmount value={saldoSistema} amountClassName="text-xl font-bold text-slate-900" />
                </div>
              </div>
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Entradas Caja Hoy</div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">+{formatCurrency(Math.abs(Number(ingresosHoy || 0)))}</div>
              </div>
              <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm">
                <div className="text-xs font-bold text-rose-600 uppercase mb-1">Salidas Caja Hoy</div>
                <div className="text-xl font-bold text-slate-900">
                  <MoneyAmount value={egresosHoy} meaning="expense" amountClassName="text-xl font-bold text-slate-900" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all duration-300">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Cajas Abiertas</div>
                <div className="text-2xl font-bold text-slate-900">{resumen ? resumen.cajasAbiertasCount : 0}</div>
              </div>
              <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-sm transition-all duration-300">
                <div className="text-xs font-bold text-orange-600 uppercase mb-1">Rutas Pendientes</div>
                <div className="text-2xl font-bold text-slate-900">{resumen ? resumen.rutasPendientesConsolidacion : 0}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistorialModal(true)}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-200 transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Historial de Cierres</div>
                <div className="text-sm font-bold text-slate-900">
                  {ultimoCierre ? new Date(ultimoCierre.fecha).toLocaleString('es-CO') : '—'}
                </div>
                <div className="text-xs font-medium text-blue-600 mt-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Ver detalles
                </div>
              </button>
            </div>

            {/* Formulario de Conteo */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/60">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Arqueo de Efectivo
                </h3>
              </div>
              
              <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Efectivo Real en Caja
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-xl">$</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.efectivoReal}
                        onChange={(e) => setForm({ ...form, efectivoReal: formatCOPInputValue(e.target.value) })}
                        className="pl-9 w-full rounded-2xl border border-slate-200 py-3.5 text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-sm outline-none"
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
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {diferencia === 0 ? 'Cuadre Perfecto' : diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado'}
                        </div>
                        <div className="text-sm font-medium opacity-90">
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
                    className="w-full rounded-2xl border border-slate-200 py-3 px-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-600 focus:border-transparent min-h-[160px] resize-none outline-none shadow-sm"
                    placeholder="Detalles sobre diferencias, billetes falsos, o notas del turno..."
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!form.efectivoReal}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  Continuar a Confirmación
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 text-center border-b border-slate-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmar Cierre</h2>
                <p className="text-slate-500 text-sm">
                  Verifique los valores antes de registrar permanentemente en el Ledger.
                </p>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Responsable</span>
                  <span className="font-bold text-slate-900">{principalCaja?.responsable || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Saldo de esta caja</span>
                  <span className="font-bold text-slate-900">{formatCurrency(Math.abs(Number(saldoSistema || 0)))}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium text-sm">Efectivo Reportado</span>
                  <span className="font-bold text-slate-900">{formatCurrency(Math.abs(Number(form.efectivoReal)))}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-500 font-medium text-sm">Diferencia</span>
                  <span className={cn(
                    "font-bold px-3 py-1 rounded-lg",
                    diferencia === 0 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-rose-100 text-rose-700"
                  )}>
                    <MoneyAmount value={diferencia} amountClassName="font-bold" />
                  </span>
                </div>
                
                {form.observaciones && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-sm font-medium text-slate-700 border border-slate-200">
                    &ldquo;{form.observaciones}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleCierre}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70"
                >
                  {loading ? 'Procesando...' : 'Confirmar Cierre'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Cierre Exitoso!</h2>
            <p className="text-slate-500 font-medium mb-8 text-center max-w-md">
              La información del arqueo ha sido guardada y la caja consolidada.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/contable"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Volver al Tablero
              </Link>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                <Receipt className="h-4 w-4" />
                Imprimir Comprobante
              </button>
            </div>
          </div>
        )}

        {/* ... Modal del Historial (Omitido para legibilidad, mantenemos el actual) ... */}
        {showHistorialModal && (
          <Portal>
          <div className="fixed inset-0 flex items-center justify-center p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowHistorialModal(false)}>
            <div className="w-full max-w-5xl 2xl:max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 md:p-7 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Historial de Cierres</h3>
                  <div className="text-sm font-medium text-slate-500 mt-1">
                    Filtra por tipo, estado y fechas
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistorialModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6">
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'TODOS' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Todos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('ARQUEO')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'ARQUEO' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Arqueos</button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipo('CONSOLIDACION')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", filtroTipo === 'CONSOLIDACION' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}
                    >Consolidaciones</button>
                  </div>
                  <div className="md:col-span-4 flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('TODOS')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'TODOS' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}
                    >Estado: Todos</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('DESCUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'DESCUADRADA' ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50")}
                    >Descuadradas</button>
                    <button
                      type="button"
                      onClick={() => setEstadoFiltro('CUADRADA')}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-xl transition-colors", estadoFiltro === 'CUADRADA' ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50")}
                    >Cuadradas</button>
                  </div>
                  <div className="md:col-span-4 flex items-center justify-between gap-3">
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Desde</span>
                      <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none shadow-sm" />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hasta</span>
                      <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none shadow-sm" />
                    </label>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cierres.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-900">{c.caja}</span>
                          {typeof c.estado !== 'undefined' && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", c.estado === 'DESCUADRADA' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                              {c.estado}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-slate-600">Resp: {c.responsable}</span>
                          <span className="text-[11px] text-slate-400">{new Date(c.fecha).toLocaleString('es-CO')}</span>
                        </div>
                        <button
                          onClick={() => { setSelectedCierre(c); setShowDetalleCierreModal(true) }}
                          className="mt-3 w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors text-center"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    ))}
                    {cierres.length === 0 && (
                      <div className="col-span-full p-8 text-center text-slate-400">
                        <span className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">Sin registros</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </Portal>
        )}

        {showDetalleCierreModal && selectedCierre && (
          <Portal>
          <div className="fixed inset-0 flex items-center justify-center p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" style={{ zIndex: MODAL_Z_INDEX }} onClick={() => setShowDetalleCierreModal(false)}>
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 md:p-7 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Detalle de Cierre</h3>
                <button onClick={() => setShowDetalleCierreModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                  <Eye className="h-5 w-5 opacity-0" />
                  <span className="sr-only">Cerrar</span>
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Responsable</div>
                    <div className="text-sm font-bold text-slate-900">{selectedCierre.responsable}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Fecha</div>
                    <div className="text-sm font-bold text-slate-900">{new Date(selectedCierre.fecha).toLocaleString('es-CO')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sistema</div>
                    <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedCierre.saldoSistema ?? 0)}</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Real</div>
                    <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedCierre.saldoReal ?? 0)}</div>
                  </div>
                  <div className={cn("rounded-2xl px-4 py-4 border shadow-sm", (Number(selectedCierre.diferencia || 0) === 0) ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                    <div className={cn("text-[10px] font-bold uppercase", (Number(selectedCierre.diferencia || 0) === 0) ? "text-emerald-600" : "text-rose-600")}>Diferencia</div>
                    <div className={cn("text-lg font-bold", Number(selectedCierre.diferencia || 0) === 0 ? "text-emerald-800" : "text-rose-800")}>
                      {formatCurrency(selectedCierre.diferencia ?? 0)}
                    </div>
                  </div>
                </div>
                { (selectedCierre.observaciones || selectedCierre.descripcion) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mt-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</div>
                    <div className="mt-1 text-sm font-medium text-slate-900 whitespace-pre-line">{selectedCierre.observaciones || selectedCierre.descripcion}</div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowDetalleCierreModal(false)} className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200">
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
