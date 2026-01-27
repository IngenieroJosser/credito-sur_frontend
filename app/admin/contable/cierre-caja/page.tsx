'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Wallet,
  Receipt
} from 'lucide-react'
import { formatCOPInputValue, formatCurrency, parseCOPInputToNumber, cn } from '@/lib/utils'

export default function CierreCajaPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Mock data del sistema (simulando estado actual)
  const cajaData = {
    id: 'CAJA-MAIN',
    nombre: 'Caja Principal Oficina',
    responsable: 'Ana Admin',
    saldoSistema: 5200000,
    ingresosDia: 12500000,
    egresosDia: 7300000,
    ultimaArqueo: 'Ayer 18:00'
  }

  const [form, setForm] = useState({
    efectivoReal: '',
    observaciones: 'Cierre normal sin novedades.'
  })

  const diferencia = form.efectivoReal 
    ? parseCOPInputToNumber(form.efectivoReal) - cajaData.saldoSistema 
    : 0

  const handleCierre = async () => {
    setLoading(true)
    // Simular API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setStep(3)
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
            href="/admin/contable"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              <span className="text-blue-600">Cierre de</span> <span className="text-orange-500">Caja</span>
            </h1>
            <p className="text-slate-500 font-medium">
              {cajaData.nombre} • {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resumen del Día */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Saldo Sistema</div>
                <div className="text-xl font-bold text-slate-900">{formatCurrency(cajaData.saldoSistema)}</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Ingresos Hoy</div>
                <div className="text-xl font-bold text-slate-900">+{formatCurrency(cajaData.ingresosDia)}</div>
              </div>
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                <div className="text-xs font-bold text-rose-600 uppercase mb-1">Egresos Hoy</div>
                <div className="text-xl font-bold text-slate-900">-{formatCurrency(cajaData.egresosDia)}</div>
              </div>
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
                      Ingrese el total contado físicamente en billetes y monedas.
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
                  <span className="font-bold text-slate-900">{cajaData.responsable}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Saldo Sistema</span>
                  <span className="font-bold text-slate-900">{formatCurrency(cajaData.saldoSistema)}</span>
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
                href="/admin/contable"
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
      </div>
    </div>
  )
}
