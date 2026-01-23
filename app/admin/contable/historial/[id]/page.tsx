'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Receipt, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Wallet
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

export default function DetalleCierrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  // State for editable observations
  const [observaciones, setObservaciones] = useState('Cierre normal sin novedades.')

  // Mock Data
  const cierre = {
    id: id,
    fecha: '2026-01-22T18:30:00',
    caja: 'Caja Principal Oficina',
    responsable: 'Ana Admin',
    saldoSistema: 5200000,
    saldoReal: 5200000,
    diferencia: 0,
    estado: 'CUADRADA',
    billetes: [
      { denominacion: 100000, cantidad: 20, total: 2000000 },
      { denominacion: 50000, cantidad: 40, total: 2000000 },
      { denominacion: 20000, cantidad: 50, total: 1000000 },
      { denominacion: 10000, cantidad: 20, total: 200000 }
    ]
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/contable"
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                <span className="text-blue-600">Detalle de</span> <span className="text-orange-500">Cierre</span>
              </h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Comprobante #{id}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all" title="Imprimir">
                <Printer className="h-5 w-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all" title="Descargar PDF">
                <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Saldo Sistema</div>
                <div className="text-2xl font-bold text-black">{formatCurrency(cierre.saldoSistema)}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Saldo Real</div>
                <div className="text-2xl font-bold text-black">{formatCurrency(cierre.saldoReal)}</div>
            </div>
            <div className={cn(
                "p-6 rounded-2xl border shadow-sm",
                cierre.diferencia === 0 ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
            )}>
                <div className={cn(
                    "text-xs font-bold uppercase mb-2",
                    cierre.diferencia === 0 ? "text-emerald-600" : "text-rose-600"
                )}>Diferencia</div>
                <div className="text-2xl font-bold text-black">
                    {cierre.diferencia > 0 ? '+' : ''}{formatCurrency(cierre.diferencia)}
                </div>
            </div>
        </div>

        {/* Ticket / Comprobante Visual */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Column: Status & Info */}
            <div className="p-8 space-y-8 border-b lg:border-b-0 lg:border-r border-slate-100">
                <div className={cn(
                    "inline-flex items-center gap-3 p-4 rounded-2xl border",
                    cierre.estado === 'CUADRADA' ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"
                )}>
                    <div className={cn(
                        "p-2 rounded-full",
                        cierre.estado === 'CUADRADA' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                        {cierre.estado === 'CUADRADA' ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                    </div>
                    <div>
                        <div className={cn(
                        "font-bold text-lg",
                        cierre.estado === 'CUADRADA' ? "text-emerald-900" : "text-rose-900"
                        )}>
                        Caja {cierre.estado}
                        </div>
                        <div className={cn(
                        "text-sm font-medium",
                        cierre.estado === 'CUADRADA' ? "text-emerald-700" : "text-rose-700"
                        )}>
                        El cierre se realizó correctamente.
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de Cierre</span>
                        <div className="text-lg font-bold text-slate-900">
                            {new Date(cierre.fecha).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Caja</span>
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                                <Wallet className="h-4 w-4 text-slate-400" />
                                {cierre.caja}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsable</span>
                            <div className="flex items-center gap-2 font-bold text-slate-900">
                                <User className="h-4 w-4 text-slate-400" />
                                {cierre.responsable}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Observaciones & Details */}
            <div className="p-8 bg-slate-50/50 space-y-8">
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-blue-500" />
                        Observaciones
                    </h3>
                    <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full p-4 bg-white rounded-xl text-black text-sm border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[100px]"
                        placeholder="Escriba aquí las observaciones..."
                    />
                </div>

                {cierre.billetes && cierre.billetes.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-900">Desglose de Efectivo</h3>
                        <div className="space-y-2">
                            {cierre.billetes.map((billete, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                                    <span className="text-slate-600 font-medium">{billete.cantidad} x {formatCurrency(billete.denominacion)}</span>
                                    <span className="font-bold text-black">{formatCurrency(billete.total)}</span>
                                </div>
                            ))}
                            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                                <span className="text-slate-900">Total Efectivo</span>
                                <span className="text-black">{formatCurrency(cierre.saldoReal)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          {/* Footer visual */}
          <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 font-mono border-t border-slate-100">
            UUID: {id} • GENERADO AUTOMÁTICAMENTE
          </div>
        </div>
      </div>
    </div>
  )
}
