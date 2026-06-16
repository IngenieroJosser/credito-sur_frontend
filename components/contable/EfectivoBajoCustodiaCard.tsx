'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Wallet, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getDeudoresCobrador } from '@/services/contabilidad-service'

interface CustodiaCobrador {
  cobradorId: string
  nombreCobrador: string
  efectivoBajoCustodia: number
}

export default function EfectivoBajoCustodiaCard() {
  const [items, setItems] = useState<CustodiaCobrador[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)

    try {
      const data = await getDeudoresCobrador()

      const rows = (Array.isArray(data) ? data : [])
        .map((d: any) => ({
          cobradorId: String(d.cobradorId || ''),
          nombreCobrador: String(d.nombreCobrador || 'Desconocido'),
          efectivoBajoCustodia: Number(d.efectivoBajoCustodia || 0),
        }))
        .filter((d) => d.cobradorId && d.efectivoBajoCustodia > 0)

      setItems(rows)
    } catch (error) {
      console.error('Error cargando efectivo bajo custodia:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const totalGlobal = items.reduce(
    (sum, item) => sum + item.efectivoBajoCustodia,
    0,
  )

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/60 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
            <Wallet className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Efectivo bajo custodia
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {loading
                ? 'Calculando...'
                : items.length === 0
                  ? 'Sin efectivo en custodia'
                  : `${items.length} cobrador(es) · Total: ${formatCurrency(totalGlobal)}`}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargar}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-300"
            title="Actualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label={expanded ? 'Contraer' : 'Expandir'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-300">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs font-bold">Cargando custodia...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Wallet className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-500">
                Sin efectivo bajo custodia
              </p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                No hay saldos positivos en cajas de ruta asignadas a cobradores.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.cobradorId}
                  className="flex items-center justify-between px-4 py-3 bg-slate-50/60 rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                      <Wallet className="h-3.5 w-3.5 text-slate-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">
                        {item.nombreCobrador}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Cobrador
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-blue-600">
                      {formatCurrency(item.efectivoBajoCustodia)}
                    </p>
                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">
                      En custodia
                    </p>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center px-4 py-3 mt-1 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Efectivo total en custodia
                  </span>
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
