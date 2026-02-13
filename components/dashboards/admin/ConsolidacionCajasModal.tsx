'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Wallet,
  ArrowRightLeft,
  History,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react'
import { Portal, MODAL_Z_INDEX } from '@/components/dashboards/shared/CobradorElements'
import { Caja, getCajas, consolidarCaja, getTransacciones, Transaccion } from '@/services/contabilidad-service'
import { formatCurrency } from '@/lib/utils'
import { useNotification } from '@/components/providers/NotificationProvider'

interface ConsolidacionCajasModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ConsolidacionCajasModal({ isOpen, onClose, onSuccess }: ConsolidacionCajasModalProps) {
  const [activeTab, setActiveTab] = useState<'consolidar' | 'historial'>('consolidar')
  const [cajas, setCajas] = useState<Caja[]>([])
  const [historial, setHistorial] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const { showNotification } = useNotification()

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'consolidar') {
        const data = await getCajas()
        // Filtrar solo cajas de ruta con saldo > 0 y que no sean la principal
        // Asumiendo que 'PRINCIPAL' es el tipo para la caja central
        setCajas(data.filter(c => c.tipo !== 'PRINCIPAL' && c.saldo > 0))
      } else {
        // Cargar historial de consolidaciones
        // Buscamos transacciones en la caja principal que sean transferencias de ingreso
        // Idealmente el backend filtraría por 'tipoReferencia', pero por ahora filtramos por descripción o tipo
        const cajaPrincipal = (await getCajas()).find(c => c.tipo === 'PRINCIPAL')
        if (cajaPrincipal) {
            const data = await getTransacciones({ 
                cajaId: cajaPrincipal.id, 
                tipo: 'INGRESO',
                limit: 50 
            })
            // Filtramos las que parecen consolidaciones
            setHistorial(data.data.filter(t => t.descripcion.includes('Consolidación')))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('error', 'No se pudieron cargar los datos', 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleConsolidar = async (caja: Caja) => {
    if (!confirm(`¿Estás seguro de recibir ${formatCurrency(caja.saldo)} de la caja ${caja.nombre}? El saldo de la caja origen quedará en $0.`)) return

    setProcessingId(caja.id)
    try {
      await consolidarCaja(caja.id)
      showNotification('success', `Se han recibido ${formatCurrency(caja.saldo)} correctamente.`, 'Consolidación Exitosa')
      
      // Recargar datos
      await loadData()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Error consolidating:', error)
      showNotification('error', 'Ocurrió un error al consolidar la caja.', 'Error')
    } finally {
      setProcessingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ zIndex: MODAL_Z_INDEX }}
      >
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                  <Wallet className="h-6 w-6" />
                </div>
                Gestión de Fondos
              </h2>
              <p className="text-slate-500 font-medium ml-14">
                Consolidación de cajas y recepción de dinero
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-8">
            <button
              onClick={() => setActiveTab('consolidar')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'consolidar'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Cajas por Recibir
              {cajas.length > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                    {cajas.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'historial'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="h-4 w-4" />
              Historial de Cierres
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            {loading && cajas.length === 0 && historial.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"/>
                  <p className="font-medium">Cargando información...</p>
               </div>
            ) : activeTab === 'consolidar' ? (
              <div className="space-y-6">
                {cajas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                    <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-100 fill-emerald-500" />
                    <h3 className="text-xl font-bold text-slate-900">Todo al día</h3>
                    <p className="max-w-xs text-center mt-2 font-medium">
                        No hay cajas con saldo pendiente de recibir en este momento.
                    </p>
                  </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cajas.map(caja => (
                            <div key={caja.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{caja.nombre}</h3>
                                            <p className="text-sm text-slate-500 font-medium">Responsable: {caja.responsable}</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                            <Wallet className="h-6 w-6" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl mb-6 border border-slate-100">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Disponible</span>
                                        <span className="text-3xl font-black text-slate-900">{formatCurrency(caja.saldo)}</span>
                                    </div>

                                    <button
                                        onClick={() => handleConsolidar(caja)}
                                        disabled={processingId === caja.id}
                                        className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {processingId === caja.id ? (
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <ArrowDownRight className="h-5 w-5" />
                                                Recibir y Vaciar Caja
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="bg-blue-50/50 px-6 py-3 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-blue-700">
                                    <AlertCircle className="h-4 w-4" />
                                    El dinero pasará a la Caja Principal
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            ) : (
              // Historial Tab
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {historial.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">
                        No hay registros de consolidación recientes.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4 font-bold">Fecha / Hora</th>
                                <th className="px-6 py-4 font-bold">Descripción</th>
                                <th className="px-6 py-4 font-bold">Responsable</th>
                                <th className="px-6 py-4 font-bold text-right">Monto Recibido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historial.map(trx => (
                                <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {new Date(trx.fecha).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {trx.descripcion}
                                        {trx.caja && <span className="block text-xs text-slate-400 mt-0.5">{trx.caja}</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {trx.responsable}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                                        +{formatCurrency(trx.monto)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}
