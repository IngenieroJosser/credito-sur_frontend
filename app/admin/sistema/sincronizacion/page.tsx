'use client'

import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  Clock, AlertTriangle, CheckCircle, 
  UploadCloud, DownloadCloud,
  ChevronDown, ChevronUp, 
  Activity, Shield, Cpu, Database,
  Cloud, CloudOff, Router
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type SyncStatus = 'online' | 'offline' | 'lan'
type TransactionStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict'
type ConflictResolution = 'pending' | 'resolved' | 'ignored'

interface Transaction {
  id: string
  type: 'credit' | 'payment' | 'client' | 'adjustment'
  description: string
  amount: number
  timestamp: string
  status: TransactionStatus
  retries: number
  priority: 'high' | 'normal' | 'low'
}

interface Conflict {
  id: string
  transactionId: string
  localVersion: string
  serverVersion: string
  description: string
  resolved: ConflictResolution
}

const SyncStatusPage = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online')
  const [clientTime, setClientTime] = useState<string>('')
  
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TRX-001',
      type: 'payment',
      description: 'Pago mensual - Cliente #1456',
      amount: 1250750, // Updated to COP values
      timestamp: '2026-01-18T10:00:00.000Z',
      status: 'pending',
      retries: 0,
      priority: 'high'
    },
    {
      id: 'TRX-002',
      type: 'credit',
      description: 'Aprobación crédito rápido',
      amount: 5000000, // Updated to COP values
      timestamp: '2026-01-18T09:55:00.000Z',
      status: 'syncing',
      retries: 1,
      priority: 'normal'
    },
    {
      id: 'TRX-003',
      type: 'client',
      description: 'Actualización datos cliente',
      amount: 0,
      timestamp: '2026-01-18T09:50:00.000Z',
      status: 'completed',
      retries: 0,
      priority: 'low'
    },
    {
      id: 'TRX-004',
      type: 'adjustment',
      description: 'Ajuste tasa interés',
      amount: -150250, // Updated to COP values
      timestamp: '2026-01-18T09:45:00.000Z',
      status: 'failed',
      retries: 2,
      priority: 'high'
    },
    {
      id: 'TRX-005',
      type: 'payment',
      description: 'Pago anticipado - Cliente #0892',
      amount: 3200000, // Updated to COP values
      timestamp: '2026-01-18T09:40:00.000Z',
      status: 'conflict',
      retries: 1,
      priority: 'high'
    }
  ])

  const [conflicts, setConflicts] = useState<Conflict[]>([
    {
      id: 'CFL-001',
      transactionId: 'TRX-005',
      localVersion: 'v1.2',
      serverVersion: 'v1.3',
      description: 'Diferencia en monto registrado',
      resolved: 'pending'
    }
  ])

  const [expandedSection, setExpandedSection] = useState<'status' | 'queue' | 'conflicts'>('status')
  const [isSyncing, setIsSyncing] = useState(false)
  const [bandwidth, setBandwidth] = useState({ upload: 1.2, download: 0.8 })

  // UseEffect para el reloj
  useEffect(() => {
    // Inicializar reloj después del montaje para evitar errores de hidratación
    const updateTime = () => {
      setClientTime(new Date().toLocaleTimeString('es-CO', { hour12: true }))
    }
    updateTime()
    
    const timeInterval = setInterval(updateTime, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  // UseEffect para simulación de estados y ancho de banda
  useEffect(() => {
    const statusInterval = setInterval(() => {
      const statuses: SyncStatus[] = ['online', 'offline', 'lan']
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      if (Math.random() > 0.95) {
        setSyncStatus(randomStatus)
      }
    }, 15000)

    const bandwidthInterval = setInterval(() => {
      if (syncStatus === 'online' && isSyncing) {
        setBandwidth({
          upload: Math.max(0.5, Math.random() * 2.5),
          download: Math.max(0.3, Math.random() * 2)
        })
      }
    }, 3000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(bandwidthInterval)
    }
  }, [syncStatus, isSyncing])

  const handleSyncNow = () => {
    setIsSyncing(true)
    
    setTimeout(() => {
      setIsSyncing(false)
      setTransactions(prev => prev.map(tx => 
        tx.status === 'pending' ? { ...tx, status: 'syncing' } : tx
      ))
    }, 2000)
  }

  const handleRetryTransaction = (id: string) => {
    setTransactions(prev => prev.map(tx =>
      tx.id === id 
        ? { ...tx, status: 'syncing', retries: tx.retries + 1 }
        : tx
      ))
  }

  const handleResolveConflict = (id: string, resolution: ConflictResolution) => {
    setConflicts(prev => prev.map(c =>
      c.id === id ? { ...c, resolved: resolution } : c
    ))
    
    if (resolution === 'resolved') {
      setTransactions(prev => prev.map(tx =>
        tx.id === conflicts.find(c => c.id === id)?.transactionId
          ? { ...tx, status: 'pending' }
          : tx
      ))
    }
  }

  const getStatusIcon = (status: SyncStatus) => {
    switch (status) {
      case 'online': return <Cloud className="w-4 h-4" />
      case 'offline': return <CloudOff className="w-4 h-4" />
      case 'lan': return <Router className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'online': return 'text-emerald-600'
      case 'offline': return 'text-slate-500'
      case 'lan': return 'text-sky-600'
    }
  }

  const getStatusBgColor = (status: SyncStatus) => {
    switch (status) {
      case 'online': return 'bg-emerald-50'
      case 'offline': return 'bg-slate-100'
      case 'lan': return 'bg-sky-50'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Header Integrado */}
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
              Monitoreo en tiempo real de la conectividad LAN/Nube y gestión de la cola de transacciones pendientes.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">{clientTime}</span>
            </div>
            <button 
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all font-bold text-sm shadow-lg shadow-slate-900/20 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda: Estado de Red */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                Estado de Conectividad
              </h2>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  syncStatus === 'online' ? 'bg-emerald-50 border-emerald-100' : 
                  syncStatus === 'lan' ? 'bg-sky-50 border-sky-100' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white shadow-sm ${getStatusColor(syncStatus)}`}>
                      {getStatusIcon(syncStatus)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Servidor Nube (VPS)</p>
                      <p className={`text-sm font-bold ${getStatusColor(syncStatus)}`}>
                        {syncStatus === 'online' ? 'Conectado (Cloud Sync OK)' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                  {syncStatus === 'online' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </div>

                <div className="p-4 rounded-xl border border-sky-100 bg-sky-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm text-sky-600">
                      <Router className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Red Local (LAN)</p>
                      <p className="text-sm font-bold text-sky-600">Conectado (Local Server OK)</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tráfico de Datos</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5" /> Subida
                      </span>
                      <span className="text-sm font-bold text-slate-900">{bandwidth.upload.toFixed(1)} Mbps</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-900 transition-all duration-1000" 
                        style={{ width: `${(bandwidth.upload / 2.5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-600 flex items-center gap-1">
                        <DownloadCloud className="w-3.5 h-3.5" /> Descarga
                      </span>
                      <span className="text-sm font-bold text-slate-900">{bandwidth.download.toFixed(1)} Mbps</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 transition-all duration-1000" 
                        style={{ width: `${(bandwidth.download / 2) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-400" />
                Seguridad de Datos
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Encriptación de tránsito</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">AES-256</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Última validación</span>
                  <span className="text-xs font-bold text-slate-900">Hace 5 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Cola de Transacciones y Conflictos */}
          <div className="lg:col-span-2 space-y-8">
            {/* Conflictos - Solo si existen */}
            {conflicts.some(c => c.resolved === 'pending') && (
              <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-[0_8px_30px_rgb(251,191,36,0.05)]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Conflictos Detectados
                  </h2>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    {conflicts.filter(c => c.resolved === 'pending').length} Pendientes
                  </span>
                </div>

                <div className="space-y-4">
                  {conflicts.filter(c => c.resolved === 'pending').map(conflict => (
                    <div key={conflict.id} className="group p-5 bg-amber-50/30 rounded-2xl border border-amber-100 hover:border-amber-200 transition-all">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-500" />
                            <h3 className="text-sm font-bold text-slate-900">
                              Conflicto en {conflict.transactionId}
                            </h3>
                          </div>
                          <p className="text-sm text-slate-600 font-medium">
                            {conflict.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="px-3 py-1.5 bg-white rounded-lg border border-amber-100 text-slate-600 font-medium shadow-sm">
                              <span className="font-bold text-slate-900">Local:</span> {conflict.localVersion}
                            </div>
                            <div className="px-3 py-1.5 bg-white rounded-lg border border-amber-100 text-slate-600 font-medium shadow-sm">
                              <span className="font-bold text-slate-900">Servidor:</span> {conflict.serverVersion}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveConflict(conflict.id, 'resolved')}
                            className="px-6 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-sm shadow-amber-500/20"
                          >
                            Resolver Conflicto
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cola de Transacciones */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-slate-400" />
                  Cola de Sincronización
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendientes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completados</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID / Fecha</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Transacción</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Monto</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{tx.id}</span>
                            <span className="text-xs font-medium text-slate-400">
                              {new Date(tx.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{tx.description}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${tx.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {tx.amount === 0 ? '-' : formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {tx.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            {tx.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                            {tx.status === 'syncing' && <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />}
                            {tx.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                            {tx.status === 'conflict' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                              tx.status === 'completed' ? 'text-emerald-600' :
                              tx.status === 'pending' ? 'text-amber-600' :
                              tx.status === 'syncing' ? 'text-blue-600' :
                              'text-rose-600'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tx.status === 'failed' && (
                            <button 
                              onClick={() => handleRetryTransaction(tx.id)}
                              className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                              title="Reintentar"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
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
    </div>
  )
}

export default SyncStatusPage