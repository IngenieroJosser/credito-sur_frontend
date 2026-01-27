'use client'

import React, { useState } from 'react'
import {
  Navigation,
  CheckCircle2,
  XCircle,
  MapPin,
  MoreVertical,
  Banknote,
  AlertTriangle,
  ArrowLeft,
  Receipt,
  Plus,
  Pencil,
  Save
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Interfaces de datos
interface ClienteRuta {
  id: string
  nombre: string
  direccion: string
  telefono: string
  cuota: number
  saldoPendiente: number
  diasMora: number
  estadoVisita: 'PENDIENTE' | 'VISITADO_PAGO' | 'VISITADO_NO_PAGO'
  horaVisita?: string
}


const DetalleRutaPage = () => {
  const params = useParams()
  // Manejo seguro del ID de la ruta
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  // Datos de prueba (Mock Data)
  const [clientes] = useState<ClienteRuta[]>([
    {
      id: '1',
      nombre: 'Maria Tienda Esquina',
      direccion: 'Calle 5 #45-20, Barrio Centro',
      telefono: '310 123 4567',
      cuota: 50000,
      saldoPendiente: 450000,
      diasMora: 0,
      estadoVisita: 'PENDIENTE'
    },
    {
      id: '2',
      nombre: 'Juan Taller Motos',
      direccion: 'Cra 10 #12-30, Barrio Norte',
      telefono: '320 987 6543',
      cuota: 100000,
      saldoPendiente: 1200000,
      diasMora: 2,
      estadoVisita: 'VISITADO_PAGO',
      horaVisita: '09:30 AM'
    },
    {
      id: '3',
      nombre: 'Ana Panadería',
      direccion: 'Av Principal #88, Barrio Sur',
      telefono: '315 555 1234',
      cuota: 75000,
      saldoPendiente: 800000,
      diasMora: 0,
      estadoVisita: 'PENDIENTE'
    },
    {
      id: '4',
      nombre: 'Pedro Comidas Rápidas',
      direccion: 'Calle 1 #2-3, Barrio Centro',
      telefono: '300 111 2233',
      cuota: 60000,
      saldoPendiente: 300000,
      diasMora: 5,
      estadoVisita: 'VISITADO_NO_PAGO',
      horaVisita: '10:15 AM'
    }
  ])



  const progreso = {
    total: clientes.length,
    visitados: clientes.filter(c => c.estadoVisita !== 'PENDIENTE').length,
    recaudado: 150000
  }

  const porcentajeProgreso = (progreso.visitados / progreso.total) * 100



  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      {/* Fondo arquitectónico */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-cyan-500 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-6 md:p-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href="/admin/rutas" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                  <ArrowLeft className="h-5 w-5 text-slate-600" />
               </Link>
               <div>
                 <h1 className="text-3xl font-bold tracking-tight">
                   <span className="text-blue-600">Ruta </span><span className="text-orange-500">Diaria</span>
                 </h1>
                 <p className="text-slate-500 font-medium text-sm">
                   {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} • ID: {rutaId}
                 </p>
              </div>
            </div>
             <Link 
              href={`/admin/rutas/${rutaId}/editar`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Pencil className="h-4 w-4" />
              <span>Activar Ruta</span>
            </Link>
            <Link 
              href={`/admin/rutas/${rutaId}/editar`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <Pencil className="h-4 w-4" />
              <span>Editar</span>
            </Link>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta de Progreso y Recaudo */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Recaudado Hoy</p>
                  <div className="text-3xl font-bold text-slate-900">{formatCurrency(progreso.recaudado)}</div>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Progreso</p>
                  <div className="text-xl font-bold text-slate-900">{progreso.visitados}/{progreso.total}</div>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeProgreso}%` }}
                />
              </div>
            </div>

          </div>
        </header>

        {/* Lista de Clientes */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-slate-500" />
            Clientes por visitar
          </h2>

          {/* Lista de Clientes - Vista Tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Cliente</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Dirección</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Estado Mora</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Financiero</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Estado Visita</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-slate-900">{cliente.nombre}</div>
                          <div className="text-xs text-slate-500 font-medium">{cliente.telefono}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{cliente.direccion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cliente.diasMora > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-bold text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            {cliente.diasMora} días
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs">
                            Al día
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-slate-500 font-medium">Cuota:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(cliente.cuota)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-slate-500 font-medium">Saldo:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(cliente.saldoPendiente)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {cliente.estadoVisita !== 'PENDIENTE' ? (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-xs border",
                              cliente.estadoVisita === 'VISITADO_PAGO' 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            )}>
                              {cliente.estadoVisita === 'VISITADO_PAGO' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {cliente.estadoVisita === 'VISITADO_PAGO' ? 'Pago' : 'No Pago'}
                              <span className="opacity-70 ml-0.5">({cliente.horaVisita})</span>
                            </div>
                         ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs">
                              Pendiente
                            </span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {cliente.estadoVisita === 'PENDIENTE' && (
                          <div className="flex justify-end gap-2">
                            <button className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all" title="No Pago">
                              <XCircle className="h-4 w-4" />
                            </button>
                            <Link 
                              href={`/admin/pagos/registrar/${cliente.id}`}
                              className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all inline-flex" 
                              title="Registrar Pago"
                            >
                              <Banknote className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        
      </div>

      
    </div>
    
  )
}

export default DetalleRutaPage
