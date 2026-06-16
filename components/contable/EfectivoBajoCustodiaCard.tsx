'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Wallet, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getCajas } from '@/services/contabilidad-service'

interface CajaCobrador {
  cobradorId: string
  nombreCobrador: string
  saldoCaja: number
}

export default function EfectivoBajoCustodiaCard() {
  const [cajasCobradores, setCajasCobradores] = useState<CajaCobrador[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const cajas = await getCajas()
      // Filtrar solo cajas de ruta activas y agrupar por cobrador
      const cajasRuta = (Array.isArray(cajas) ? cajas : [])
        .filter((c: any) => c.tipo === 'RUTA' && c.activa && c.ruta?.cobradorId)
        .map((c: any) => ({
          cobradorId: c.ruta.cobradorId,
          nombreCobrador: c.ruta.cobrador?.nombres 
            ? `${c.ruta.cobrador.nombres} ${c.ruta.cobrador.apellidos || ''}`.trim()
            : 'Desconocido',
          saldoCaja: Number(c.saldoActual || 0),
        }))
      
      // Agrupar por cobrador (sumar saldos si hay múltiples cajas por cobrador)
      const agrupado = new Map<string, CajaCobrador>()
      for (const caja of cajasRuta) {
        const existente = agrupado.get(caja.cobradorId)
        if (existente) {
          existente.saldoCaja += caja.saldoCaja
        } else {
          agrupado.set(caja.cobradorId, caja)
        }
      }
      
      setCajasCobradores(Array.from(agrupado.values()))
    } catch (error) {
      console.error('Error cargando cajas de cobradores:', error)
      setCajasCobradores([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const totalGlobal = cajasCobradores.reduce((sum, c) => sum + c.saldoCaja, 0)

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Efectivo bajo custodia
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {loading
                ? 'Calculando...'
                : cajasCobradores.length === 0
                ? 'Sin cajas activas'
                : `${cajasCobradores.length} cobrador(es) · Total: ${formatCurrency(totalGlobal)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); cargar() }}
            onKeyDown={e => e.key === 'Enter' && cargar()}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-300 cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </div>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Cuerpo */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-300">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs font-bold">Cargando cajas...</span>
            </div>
          ) : cajasCobradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Wallet className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-500">Sin cajas de ruta activas</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                No hay cajas de ruta asignadas a cobradores en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cajasCobradores.map((c) => (
                <div key={c.cobradorId} className="flex items-center justify-between px-4 py-3 bg-slate-50/60 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{c.nombreCobrador}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Cobrador
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">
                      {formatCurrency(c.saldoCaja)}
                    </p>
                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest text-right">EN CAJA</p>
                  </div>
                </div>
              ))}

              {/* Total global */}
              <div className="flex justify-between items-center px-4 py-3 mt-1 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Efectivo Total en Custodia</span>
                </div>
                <span className="text-base font-black text-blue-700">
                  {formatCurrency(totalGlobal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
