'use client'

import React, { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  FileText,
  Tag,
  Clock,
  CheckCircle2,
  Printer,
  Download
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

export default function DetalleMovimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Mock data - En producción vendría de DB
  const movimiento = {
    id: id,
    fecha: '2026-01-20T11:00:00.000Z',
    concepto: 'Combustible Ruta Norte',
    tipo: 'EGRESO',
    monto: 25000,
    categoria: 'GASTO_OPERATIVO',
    responsable: 'Carlos Cobrador',
    referencia: 'Ticket #998877',
    estado: 'APROBADO',
    caja: 'Caja Principal Oficina',
    creadoPor: 'Ana Admin'
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/contable"
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Movimiento #{id}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  {movimiento.estado}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Detalle del Movimiento
              </h1>
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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          {/* Cabecera con Monto */}
          <div className="p-8 text-center border-b border-slate-100 bg-slate-50/30">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4",
              movimiento.tipo === 'INGRESO' 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-rose-50 text-rose-600 border-rose-100"
            )}>
              {movimiento.tipo === 'INGRESO' ? <ArrowDownLeft className="h-8 w-8" /> : <ArrowUpRight className="h-8 w-8" />}
            </div>
            <div className={cn(
              "text-4xl font-bold tracking-tight mb-2",
              movimiento.tipo === 'INGRESO' ? "text-emerald-600" : "text-rose-600"
            )}>
              {movimiento.tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(movimiento.monto)}
            </div>
            <p className="text-lg font-medium text-slate-900">{movimiento.concepto}</p>
          </div>

          <div className="p-0 divide-y divide-slate-100">
            <div className="flex p-6 hover:bg-slate-50 transition-colors">
              <div className="w-10 text-slate-400"><Tag className="h-5 w-5" /></div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Categoría</div>
                <div className="font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded-md inline-block text-sm">
                  {movimiento.categoria.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <div className="flex p-6 hover:bg-slate-50 transition-colors">
              <div className="w-10 text-slate-400"><Calendar className="h-5 w-5" /></div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</div>
                <div className="font-medium text-slate-900">
                  {new Date(movimiento.fecha).toLocaleString('es-CO', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </div>
              </div>
            </div>

            <div className="flex p-6 hover:bg-slate-50 transition-colors">
              <div className="w-10 text-slate-400"><User className="h-5 w-5" /></div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Responsable</div>
                <div className="font-medium text-slate-900">{movimiento.responsable}</div>
              </div>
            </div>

            <div className="flex p-6 hover:bg-slate-50 transition-colors">
              <div className="w-10 text-slate-400"><FileText className="h-5 w-5" /></div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Referencia / Soporte</div>
                <div className="font-medium text-slate-900">{movimiento.referencia || 'Sin referencia'}</div>
              </div>
            </div>

            <div className="flex p-6 hover:bg-slate-50 transition-colors">
              <div className="w-10 text-slate-400"><Clock className="h-5 w-5" /></div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Registro</div>
                <div className="text-sm text-slate-600">
                  Registrado por <span className="font-bold">{movimiento.creadoPor}</span> en {movimiento.caja}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
