'use client'

import React, { useState } from 'react'
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Wallet
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { ExportButton } from '@/components/ui/ExportButton'

// Mock Data
interface Transaccion {
  id: string
  fecha: string
  concepto: string
  tipo: 'INGRESO' | 'EGRESO'
  monto: number
  metodo: 'EFECTIVO' | 'TRANSFERENCIA'
  responsable: string
}

const TesoreriaPage = () => {
  const [activeTab, setActiveTab] = useState<'RESUMEN' | 'INGRESOS' | 'EGRESOS'>('RESUMEN')

  // Mock Data
  const transacciones: Transaccion[] = [
    {
      id: 'TRX-001',
      fecha: '2026-01-21T10:30:00',
      concepto: 'Recaudo Ruta Norte - Cierre Parcial',
      tipo: 'INGRESO',
      monto: 1250000,
      metodo: 'EFECTIVO',
      responsable: 'Juan Cobrador'
    },
    {
      id: 'TRX-002',
      fecha: '2026-01-21T09:00:00',
      concepto: 'Desembolso Préstamo #452',
      tipo: 'EGRESO',
      monto: 500000,
      metodo: 'TRANSFERENCIA',
      responsable: 'Maria Tesorera'
    },
    {
      id: 'TRX-003',
      fecha: '2026-01-21T08:15:00',
      concepto: 'Entrega Base Ruta Sur',
      tipo: 'EGRESO',
      monto: 2000000,
      metodo: 'EFECTIVO',
      responsable: 'Maria Tesorera'
    }
  ]

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
             <ExportButton label="Reporte Diario" />
             <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 transform active:scale-95">
                <Wallet className="h-4 w-4" />
                Arqueo de Caja
             </button>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Landmark className="h-24 w-24 text-blue-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Saldo Total Disponible</h3>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(resumen.saldoTotal)}</div>
            <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500">
               <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Efectivo: {formatCurrency(resumen.efectivoCaja)}</span>
               <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> Bancos: {formatCurrency(resumen.bancos)}</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-24 w-24 text-emerald-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Ingresos Hoy</h3>
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(resumen.ingresosHoy)}</div>
            <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 inline-block px-2 py-1 rounded-full">
               +12% vs Ayer
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingDown className="h-24 w-24 text-rose-600" />
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Egresos Hoy</h3>
            <div className="text-3xl font-bold text-rose-600">{formatCurrency(resumen.egresosHoy)}</div>
            <div className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 inline-block px-2 py-1 rounded-full">
               Dentro del presupuesto
            </div>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50">
            <h3 className="font-bold text-slate-900">Movimientos Recientes</h3>
            <div className="relative w-full md:w-auto">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Buscar transacción..." 
                 className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-medium w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
               />
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transacciones.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {new Date(trx.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TesoreriaPage
