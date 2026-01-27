'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  User,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

const vencidaDetalleMock = {
  numeroPrestamo: 'P-2024-110',
  cliente: {
    id: 'CLI-010',
    nombre: 'Laura Martínez',
    documento: 'V-10101010',
    telefono: '310 555 7788',
    direccion: 'Cll 10 # 5-12',
  },
  prestamo: {
    montoOriginal: 1200000,
    saldoCapital: 650000,
    cuotaPromedio: 70000,
    frecuencia: 'semanal',
    proximoVencimiento: '2024-02-15',
  },
  vencido: {
    cuotasVencidas: 3,
    totalVencido: 210000,
    diasAtraso: 30,
    nivelRiesgo: 'AMARILLO',
  },
  historialGestion: [
    { fecha: '2024-01-18', usuario: 'Carlos Ruiz', tipo: 'VISITA', nota: 'Cliente solicitó prórroga por 7 días.' },
    { fecha: '2024-01-12', usuario: 'Carlos Ruiz', tipo: 'LLAMADA', nota: 'Se informa saldo vencido y se agenda visita.' },
  ],
}

export default function DetalleCuentaVencidaSupervisorPage({ params }: { params: { id: string } }) {
  const { id } = params
  const data = vencidaDetalleMock

  const [nota, setNota] = useState('')
  const [activeTab, setActiveTab] = useState<'historial' | 'reprogramar' | 'supervisor'>('historial')

  return (
    <div className="min-h-screen bg-slate-50 relative pb-8">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-amber-500 opacity-15 blur-[100px]"></div>
      </div>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="px-6 py-3 w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/supervisor/cuentas-vencidas" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                Expediente de Vencidas #{id}
              </h1>
              <p className="text-xs font-medium text-slate-500">Préstamo {data.numeroPrestamo}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 w-full mx-auto space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User className="w-24 h-24 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Deudor</h3>
            <div className="relative z-10">
              <div className="text-xl font-bold text-slate-900 mb-1">{data.cliente.nombre}</div>
              <div className="text-sm text-slate-500 font-mono mb-4">{data.cliente.documento}</div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {data.cliente.telefono}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {data.cliente.direccion}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Link
                  href={`/supervisor/clientes/${data.cliente.id}`}
                  className="flex-1 py-2 text-center text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Ver Perfil
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <span className="px-4 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-full text-sm border border-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Riesgo {data.vencido.nivelRiesgo}
              </span>
            </div>

            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4">Estado de Vencidas</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Cuotas Vencidas</p>
                <p className="text-3xl font-bold text-slate-900">{data.vencido.cuotasVencidas}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Vencido</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.vencido.totalVencido)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Días de Atraso</p>
                <p className="text-2xl font-bold text-slate-900">{data.vencido.diasAtraso}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Saldo Capital</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.prestamo.saldoCapital)}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-100">
              <Link
                href={`/supervisor/pagos/registrar/${data.cliente.id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-white text-slate-900 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 shadow-sm transition-all"
              >
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registrar Pago
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Detalles del Préstamo
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Monto Original</span>
                <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.montoOriginal)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Saldo Capital Actual</span>
                <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.saldoCapital)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Valor Cuota</span>
                <span className="font-medium text-slate-900">{formatCurrency(data.prestamo.cuotaPromedio)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-500 text-sm">Frecuencia</span>
                <span className="font-medium text-slate-900 capitalize">{data.prestamo.frecuencia}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('historial')}
                className={cn(
                  'flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative',
                  activeTab === 'historial' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                <Clock className="w-4 h-4" />
                Historial de Gestión
                {activeTab === 'historial' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
              </button>
              <button
                onClick={() => setActiveTab('reprogramar')}
                className={cn(
                  'flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative',
                  activeTab === 'reprogramar' ? 'text-orange-600 bg-orange-50/50' : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                <CalendarDays className="w-4 h-4" />
                Reprogramar
                {activeTab === 'reprogramar' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>}
              </button>
              <button
                onClick={() => setActiveTab('supervisor')}
                className={cn(
                  'flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative',
                  activeTab === 'supervisor' ? 'text-amber-700 bg-amber-50/50' : 'text-slate-500 hover:bg-slate-50',
                )}
              >
                <ShieldAlert className="w-4 h-4" />
                Pasar a Supervisor
                {activeTab === 'supervisor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"></div>}
              </button>
            </div>

            <div className="p-5">
              {activeTab === 'historial' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex gap-4">
                    <textarea
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Agregar nueva nota de gestión..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-16 text-slate-900 placeholder:text-slate-400"
                    />
                    <button className="self-end px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Guardar
                    </button>
                  </div>

                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 py-2">
                    {data.historialGestion.map((item, idx) => (
                      <div key={idx} className="relative pl-8">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-500 uppercase">{item.tipo}</span>
                          <span className="text-xs text-slate-400">{item.fecha}</span>
                        </div>
                        <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {item.nota}
                          <span className="block mt-2 text-xs text-slate-400 font-medium">— {item.usuario}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reprogramar' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800">La reprogramación queda registrada como solicitud.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Fecha de Pago</label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cuota Propuesta</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 font-medium placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Motivo / Acuerdo</label>
                      <textarea
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-slate-900 text-sm h-20 resize-none placeholder:text-slate-400"
                        placeholder="Describa el acuerdo..."
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Solicitar Reprogramación
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'supervisor' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">Escalar este caso notificará al Supervisor de zona.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Informe para Supervisor</label>
                    <textarea
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-900 text-sm h-24 resize-none placeholder:text-slate-400"
                      placeholder="Detalle por qué este caso requiere intervención..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Escalar Caso
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
