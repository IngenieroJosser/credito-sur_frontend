'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
      case 'online': return 'text-emerald-500'
      case 'offline': return 'text-gray-400'
      case 'lan': return 'text-[#08557f]'
    }
  }

  const getStatusBgColor = (status: SyncStatus) => {
    switch (status) {
      case 'online': return 'bg-emerald-50'
      case 'offline': return 'bg-gray-100'
      case 'lan': return 'bg-[#08557f]/5'
    }
  }

  const getTransactionStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5" />
      case 'syncing': return <RefreshCw className="w-3.5 h-3.5" />
      case 'completed': return <CheckCircle className="w-3.5 h-3.5" />
      case 'failed': return <AlertTriangle className="w-3.5 h-3.5" />
      case 'conflict': return <Shield className="w-3.5 h-3.5" />
    }
  }

  const getTransactionStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'pending': return 'text-amber-500'
      case 'syncing': return 'text-[#08557f]'
      case 'completed': return 'text-emerald-500'
      case 'failed': return 'text-rose-500'
      case 'conflict': return 'text-orange-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'ahora'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  const getConnectionDetails = () => {
    switch (syncStatus) {
      case 'online':
        return {
          title: 'Servidor Central',
          description: 'Sincronización activa',
          latency: '28ms'
        }
      case 'offline':
        return {
          title: 'Modo Local',
          description: 'Operando sin conexión',
          latency: '—'
        }
      case 'lan':
        return {
          title: 'Red Interna',
          description: 'Sincronización LAN',
          latency: '5ms'
        }
    }
  }

  const details = getConnectionDetails()

  const pendingTransactions = transactions.filter(t => 
    t.status === 'pending' || t.status === 'syncing'
  ).length

  return (
    <div className="min-h-screen bg-white">
      {/* Fondo arquitectónico ultra sutil */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white"></div>
        {/* Líneas de estructura */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to right, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '96px 1px',
          opacity: 0.03
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(to bottom, #08557f 0.5px, transparent 0.5px)`,
          backgroundSize: '1px 96px',
          opacity: 0.03
        }}></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {/* Header minimalista */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                  <div className="relative w-6 h-6 opacity-80">
                    <Image
                      src="/android-chrome-512x512.png"
                      alt="CrediSur"
                      width={24}
                      height={24}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-light text-gray-800 tracking-tight">
                  Sincronización
                </h1>
                <p className="text-xs text-gray-400 font-light tracking-wide">
                  Estado del sistema en tiempo real
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1.5 rounded-lg ${getStatusBgColor(syncStatus)} border border-gray-200/50`}>
                <div className="flex items-center space-x-2">
                  <div className={`${getStatusColor(syncStatus)}`}>
                    {getStatusIcon(syncStatus)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 capitalize">
                    {syncStatus}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || syncStatus === 'offline'}
                className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                  isSyncing || syncStatus === 'offline'
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg"></div>
                <div className="relative px-4 py-2 flex items-center space-x-2">
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {isSyncing ? 'Sincronizando' : 'Sincronizar'}
                  </span>
                </div>
              </button>
            </div>
          </div>
          
          {/* Barra de tiempo */}
          <div className="pt-4 border-t border-gray-200/30">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-3">
                <Cpu className="w-3.5 h-3.5" />
                <span>Sistema de sincronización • v2.0.1</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono">{clientTime || '--:--:--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="space-y-3">
          {/* Tarjeta de estado principal */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-base font-medium text-gray-800 mb-1">
                    Estado de Conexión
                  </h2>
                  <p className="text-sm text-gray-500">
                    {details.description}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Latencia</div>
                    <div className="text-sm font-medium text-gray-700">{details.latency}</div>
                  </div>
                  <div className="w-12 h-12 relative">
                    <div className="absolute inset-0 border-2 border-gray-200/30 rounded-full"></div>
                    <div className={`absolute inset-2 rounded-full ${getStatusBgColor(syncStatus)} flex items-center justify-center`}>
                      {getStatusIcon(syncStatus)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50/50 rounded-lg border border-gray-100/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Base Local</span>
                  </div>
                  <div className="text-2xl font-light text-gray-800">
                    {transactions.length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">transacciones</div>
                </div>
                
                <div className="p-4 bg-gray-50/50 rounded-lg border border-gray-100/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <UploadCloud className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Subida</span>
                  </div>
                  <div className="text-2xl font-light text-gray-800">
                    {bandwidth.upload.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Mbps</div>
                </div>
                
                <div className="p-4 bg-gray-50/50 rounded-lg border border-gray-100/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <DownloadCloud className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Descarga</span>
                  </div>
                  <div className="text-2xl font-light text-gray-800">
                    {bandwidth.download.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Mbps</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de transacciones */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-gray-400" />
                  <div>
                    <h2 className="text-base font-medium text-gray-800">
                      Cola de Transacciones
                    </h2>
                    <p className="text-sm text-gray-500">
                      {pendingTransactions} pendientes de sincronización
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'queue' ? 'status' : 'queue')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {expandedSection === 'queue' ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              
              {expandedSection === 'queue' && (
                <div className="space-y-3 pt-4 border-t border-gray-200/30">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="group relative"
                    >
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-[#08557f] transition-colors"></div>
                      
                      <div className="p-3 hover:bg-gray-50/50 rounded-lg transition-colors duration-300 border border-transparent hover:border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${getTransactionStatusColor(transaction.status)}/10`}>
                              {getTransactionStatusIcon(transaction.status)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-800">
                                  {transaction.id}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  transaction.priority === 'high' ? 'bg-rose-50 text-rose-600' :
                                  transaction.priority === 'normal' ? 'bg-amber-50 text-amber-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {transaction.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {transaction.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              {transaction.amount !== 0 && (
                                <div className={`text-sm font-medium ${
                                  transaction.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1" suppressHydrationWarning>
                                {formatTimeAgo(transaction.timestamp)}
                              </div>
                            </div>
                            
                            {transaction.status === 'pending' && (
                              <button
                                onClick={() => handleRetryTransaction(transaction.id)}
                                className="px-3 py-1.5 text-xs font-medium text-[#08557f] hover:bg-[#08557f]/5 rounded-lg transition-colors"
                              >
                                Reintentar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta de conflictos */}
          {conflicts.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <Shield className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium text-gray-800">
                        Conflictos de Datos
                      </h2>
                      <p className="text-sm text-gray-500">
                        {conflicts.filter(c => c.resolved === 'pending').length} requieren atención
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {conflicts.map((conflict) => (
                    <div key={conflict.id} className="p-4 bg-orange-50/30 rounded-lg border border-orange-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-800">
                            Conflicto en {conflict.transactionId}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {conflict.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                            <div>
                              <span className="font-medium text-gray-700">Local:</span> {conflict.localVersion}
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Servidor:</span> {conflict.serverVersion}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleResolveConflict(conflict.id, 'resolved')}
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Resolver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SyncStatusPage