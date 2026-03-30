'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  RefreshCw, 
  Clock, AlertTriangle, CheckCircle, 
  DownloadCloud,
  Database, Download,
  Cloud, CloudOff, Trash2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useOffline } from '@/hooks/useOffline'
import { usePermission } from '@/hooks/usePermission'
import { offlineQueue } from '@/lib/offline/offlineQueue'
import { offlineStore } from '@/lib/offline/offlineDb'
import { syncManager } from '@/lib/offline/syncManager'
import type { OfflineQueueItem, SyncMeta } from '@/lib/offline/offlineDb'
import ListaConflictos from '@/components/conflictos/ListaConflictos'

const SyncStatusPage = () => {
  const { isOnline, pendingOps, failedOps, isSyncing, syncNow, downloadForOffline } = useOffline()
  const { rol } = usePermission()
  const [clientTime, setClientTime] = useState<string>('')
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([])
  const [syncMeta, setSyncMeta] = useState<Record<string, SyncMeta | undefined>>({})
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({})
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null)

  const bullBoardUrl = (() => {
    const rawBase = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://credito-sur-backend.onrender.com'
        : 'http://127.0.0.1:3001')

    const normalized = rawBase.replace(/\/$/, '')
    const base = normalized.endsWith('/api-credisur') ? normalized : `${normalized}/api-credisur`
    return `${base}/configuracion/colas`
  })()

  const loadData = useCallback(async () => {
    const [items, cMeta, pMeta, rMeta, cCount, pCount, cuCount, rCount] = await Promise.all([
      offlineQueue.getAll(),
      offlineStore.getSyncMeta('clientes'),
      offlineStore.getSyncMeta('prestamos'),
      offlineStore.getSyncMeta('rutas'),
      offlineStore.count('clientes'),
      offlineStore.count('prestamos'),
      offlineStore.count('cuotas'),
      offlineStore.count('rutas'),
    ])
    setQueueItems(items)
    setSyncMeta({ clientes: cMeta, prestamos: pMeta, rutas: rMeta })
    setRecordCounts({ clientes: cCount, prestamos: pCount, cuotas: cuCount, rutas: rCount })
  }, [])

  useEffect(() => {
    const updateTime = () => {
      setClientTime(new Date().toLocaleTimeString('es-CO', { hour12: true }))
    }
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)
    return () => clearInterval(timeInterval)
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10_000)
    return () => clearInterval(interval)
  }, [loadData, pendingOps, failedOps])

  const handleSyncNow = async () => {
    const result = await syncNow()
    if (result) {
      setLastSyncResult(`Procesados: ${result.processed} | OK: ${result.succeeded} | Fallidos: ${result.failed}`)
      setTimeout(() => setLastSyncResult(null), 8000)
    }
    await loadData()
  }

  const handleDownload = async () => {
    const result = await downloadForOffline()
    if (result) {
      setLastSyncResult(`Descargados: ${result.clientes} clientes, ${result.prestamos} préstamos, ${result.rutas} rutas`)
      setTimeout(() => setLastSyncResult(null), 8000)
    }
    await loadData()
  }

  const handleClearCompleted = async () => {
    await offlineQueue.clearCompleted()
    await loadData()
  }

  const handleRetry = async (id: string) => {
    await offlineQueue.updateStatus(id, 'pending')
    await loadData()
  }

  const handleRemove = async (id: string) => {
    await offlineQueue.remove(id)
    await loadData()
  }

  const formatSyncTime = (iso?: string) => {
    if (!iso) return 'Nunca'
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Hace un momento'
    if (diffMin < 60) return `Hace ${diffMin} min`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `Hace ${diffHrs}h`
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-600/20">
                <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-blue-600">Estado de </span><span className="text-orange-500">Sincronización</span>
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500 max-w-xl">
              Monitoreo en tiempo real de la conectividad y gestión de la cola de operaciones offline.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700" suppressHydrationWarning>{clientTime}</span>
            </div>
            {rol === 'SUPER_ADMINISTRADOR' && (
              <button
                onClick={() => window.open(bullBoardUrl, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm active:scale-95"
                title="Abrir monitoreo de colas (Bull Board)"
              >
                <Database className="w-4 h-4" />
                <span className="hidden sm:inline">Bull Board</span>
                <span className="sm:hidden">Colas</span>
              </button>
            )}
            <button 
              onClick={handleDownload}
              disabled={isSyncing || !isOnline}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all font-bold text-sm shadow-sm active:scale-95"
              title="Descargar datos del servidor para trabajar offline"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar Datos</span>
              <span className="sm:hidden">Descargar</span>
            </button>
            <button 
              onClick={handleSyncNow}
              disabled={isSyncing || !isOnline}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 border border-blue-500 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all font-bold text-sm shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        </header>

        {lastSyncResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-800">{lastSyncResult}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                {isOnline ? <Cloud className="w-5 h-5 text-emerald-500" /> : <CloudOff className="w-5 h-5 text-slate-400" />}
                Estado de Conexión
              </h2>
              
              <div className={`p-4 rounded-xl border flex items-center justify-between mb-4 ${
                isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isOnline ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Servidor</p>
                    <p className={`text-sm font-bold ${isOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {isOnline ? 'Conectado' : 'Sin conexión'}
                    </p>
                  </div>
                </div>
                {isOnline && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-xl md:text-2xl font-black text-amber-700">{pendingOps}</p>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendientes</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                  <p className="text-xl md:text-2xl font-black text-rose-700">{failedOps}</p>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Fallidos</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-400" />
                Datos Offline
              </h2>
              <div className="space-y-4">
                {(['clientes', 'prestamos', 'cuotas', 'rutas'] as const).map((store) => (
                  <div key={store} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-sm font-bold text-slate-700 capitalize">{store}</span>
                      <p className="text-[10px] text-slate-400">{formatSyncTime(syncMeta[store]?.lastSyncAt)}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {recordCounts[store] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <DownloadCloud className="w-5 h-5 text-slate-400" />
                  Cola de Sincronización
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 md:gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="font-bold text-slate-500 uppercase tracking-wider">Fallido</span>
                    </div>
                  </div>
                  {queueItems.length > 0 && (
                    <button
                      onClick={handleClearCompleted}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {queueItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-100 inline-block mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 mb-1">¡Todo sincronizado!</h3>
                  <p className="text-xs text-slate-500">No hay operaciones pendientes en la cola.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID / Fecha</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Operación</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {queueItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{item.id.slice(0, 16)}</span>
                              <span className="text-xs font-medium text-slate-400">
                                {new Date(item.createdAt).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">{item.description}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-slate-900">
                              {item.amount ? formatCurrency(item.amount) : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {item.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                              {item.status === 'syncing' && <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />}
                              {item.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                              <div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                  item.status === 'pending' ? 'text-amber-600' :
                                  item.status === 'syncing' ? 'text-blue-600' :
                                  'text-rose-600'
                                }`}>
                                  {item.status === 'pending' ? 'Pendiente' : item.status === 'syncing' ? 'Enviando' : 'Fallido'}
                                </span>
                                {item.lastError && (
                                  <p className="text-[10px] text-rose-500 truncate max-w-[200px]">{item.lastError}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {item.status === 'failed' && (
                                <button 
                                  onClick={() => handleRetry(item.id)}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                  title="Reintentar"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleRemove(item.id)}
                                className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Sección de Conflictos Centralizados */}
            <ListaConflictos />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyncStatusPage