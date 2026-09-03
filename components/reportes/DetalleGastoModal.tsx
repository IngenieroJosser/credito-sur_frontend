 'use client'
 
 import React, { useEffect, useMemo, useState } from 'react'
 import { X, Calendar, Eye, Receipt, Clock, Wallet } from 'lucide-react'
 import { formatCurrency, cn } from '@/lib/utils'
 import { getGastos } from '@/services/contabilidad-service'
 import type { Gasto } from '@/services/contabilidad-service'
 import { TipoGasto } from '@/types/enums'
import Paginador from '@/components/ui/Paginador'
 
 interface DetalleGastoModalProps {
   categoria: string
   porcentaje: number
   monto: number
   onClose: () => void
 }
 
 const mapCategoriaToTipoGasto = (categoria: string): TipoGasto => {
   const c = categoria.toLowerCase()
   if (c.includes('transporte')) return TipoGasto.TRANSPORTE
   if (c.includes('otro')) return TipoGasto.OTRO
   return TipoGasto.OPERATIVO
 }
 
 export default function DetalleGastoModal({ categoria, porcentaje, monto, onClose }: DetalleGastoModalProps) {
   const [loading, setLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)
   const [gastos, setGastos] = useState<Gasto[]>([])
  const [pagina, setPagina] = useState(1)
  const pageSize = 5
 
   const tipo = useMemo(() => mapCategoriaToTipoGasto(categoria), [categoria])
 
   useEffect(() => {
     const cargar = async () => {
       setLoading(true)
       setError(null)
       try {
        const resp = await getGastos()
        const todos = resp.data
        const filtrados = todos
          .filter(g => g.tipo === tipo)
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        setGastos(filtrados)
        setPagina(1)
       } catch (e: any) {
        setError('No se pudieron cargar los detalles del gasto')
       } finally {
         setLoading(false)
       }
     }
     cargar()
   }, [tipo])
 
   const fechaReporteTexto = useMemo(() => {
     try {
       return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
     } catch {
       return new Date().toLocaleDateString()
     }
   }, [])
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
         
         <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
           <div className="min-w-0">
             <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-100 mb-2">
               <Receipt className="h-3.5 w-3.5" />
               <span>Detalle de Gasto</span>
             </div>
             <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Distribución de Gastos</h2>
             <div className="flex items-center gap-4 mt-1">
               <p className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                 <Calendar className="h-4 w-4" />
                 <span className="text-slate-700">{fechaReporteTexto}</span>
               </p>
               
             </div>
           </div>
           <button 
             onClick={onClose}
             className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
           >
             <X className="h-5 w-5" />
           </button>
         </div>
 
         <div className="p-8 space-y-8">
 
           <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                   <Wallet className="w-4 h-4" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Categoría</p>
                   <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(monto)}</p>
                 </div>
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                   <Eye className="w-4 h-4" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros</p>
                   <p className="mt-1 text-xl font-black text-slate-900">{gastos.length}</p>
                 </div>
               </div>
             </div>
             <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                   <Clock className="w-4 h-4" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Movimiento</p>
                   <p className="mt-1 text-sm font-bold text-slate-700">
                     {gastos[0]?.fecha ? new Date(gastos[0].fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                   </p>
                 </div>
               </div>
             </div>
           </section>
 
           <section className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-white/50 flex items-center justify-between">
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Movimientos de {categoria}</h3>
               {!loading && (
                 <span className="text-[10px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-2 py-1 rounded-lg">
                   {gastos.length} REGISTROS
                 </span>
               )}
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                   <tr>
                     <th className="px-6 py-3 text-left">Fecha</th>
                     <th className="px-6 py-3 text-left">Hora</th>
                     <th className="px-6 py-3 text-left">Descripción</th>
                     <th className="px-6 py-3 text-left">Tipo</th>
                     <th className="px-6 py-3 text-right">Monto</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                   {loading ? (
                     <tr>
                       <td className="px-6 py-4 text-slate-500" colSpan={5}>Cargando...</td>
                     </tr>
                   ) : error ? (
                     <tr>
                       <td className="px-6 py-4 text-rose-600 font-bold" colSpan={5}>{error}</td>
                     </tr>
                   ) : gastos.length === 0 ? (
                     <tr>
                       <td className="px-6 py-4 text-slate-500" colSpan={5}>No hay movimientos para esta categoría.</td>
                     </tr>
                   ) : (
                     gastos.slice((pagina - 1) * pageSize, pagina * pageSize).map((g) => {
                       const fecha = new Date(g.fecha)
                       const fechaTexto = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                       const horaTexto = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
                       return (
                         <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-6 py-4 text-slate-600 font-medium text-xs">{fechaTexto}</td>
                           <td className="px-6 py-4 text-slate-600 font-medium text-xs">{horaTexto}</td>
                           <td className="px-6 py-4 font-bold text-slate-800">{g.descripcion}</td>
                           <td className="px-6 py-4">
                             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                               EGRESO
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right font-black text-rose-600">-{formatCurrency(g.monto)}</td>
                         </tr>
                       )
                     })
                   )}
                 </tbody>
               </table>
             </div>
             <div className="px-6 py-4 bg-white border-t border-slate-100">
               <Paginador
                 pagina={pagina}
                 totalPaginas={Math.max(1, Math.ceil(gastos.length / pageSize))}
                 onCambiar={setPagina}
                 className="mt-0"
               />
             </div>
           </section>
         </div>
       </div>
     </div>
   )
 }
