'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Wifi, WifiOff, Network, RefreshCw, 
  Clock, AlertTriangle, CheckCircle, 
  UploadCloud, DownloadCloud, Server,
  ChevronDown, ChevronUp, HardDrive, 
  Activity, Shield, Cpu, Database,
  Cloud, CloudOff, Router
} from 'lucide-react'

type SyncStatus = 'online' | 'offline' | 'lan'
type TransactionStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict'
type ConflictResolution = 'pending' | 'resolved' | 'ignored'

interface Transaction {
  id: string
  type: 'credit' | 'payment' | 'client' | 'adjustment'
  description: string
  amount: number
  timestamp: string // Cambiado a string para SSR consistency
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
  const [lastSync, setLastSync] = useState<string>('')
  const [clientTime, setClientTime] = useState<string>('')
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TRX-001',
      type: 'payment',
      description: 'Pago mensual - Cliente #1456',
      amount: 1250.75,
      timestamp: '',
      status: 'pending',
      retries: 0,
      priority: 'high'
    },
    {
      id: 'TRX-002',
      type: 'credit',
      description: 'Aprobación crédito rápido',
      amount: 5000,
      timestamp: '',
      status: 'syncing',
      retries: 1,
      priority: 'normal'
    },
    {
      id: 'TRX-003',
      type: 'client',
      description: 'Actualización datos cliente',
      amount: 0,
      timestamp: '',
      status: 'completed',
      retries: 0,
      priority: 'low'
    },
    {
      id: 'TRX-004',
      type: 'adjustment',
      description: 'Ajuste tasa interés',
      amount: -150.25,
      timestamp: '',
      status: 'failed',
      retries: 2,
      priority: 'high'
    },
    {
      id: 'TRX-005',
      type: 'payment',
      description: 'Pago anticipado - Cliente #0892',
      amount: 3200,
      timestamp: '',
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
  const [mounted, setMounted] = useState(false)

  // Inicializar timestamps solo en el cliente
  useEffect(() => {
    setMounted(true)
    
    const now = new Date()
    setLastSync(now.toISOString())
    setClientTime(now.toLocaleTimeString('es-ES', { hour12: false }))
    
    // Inicializar timestamps de transacciones
    setTransactions(prev => prev.map((tx, index) => ({
      ...tx,
      timestamp: new Date(Date.now() - (1000 * 60 * (5 * (index + 1)))).toISOString()
    })))

    // Configurar intervalo para tiempo en cliente
    const timeInterval = setInterval(() => {
      setClientTime(new Date().toLocaleTimeString('es-ES', { hour12: false }))
    }, 1000)

    // Simular cambios de estado de conexión
    const statusInterval = setInterval(() => {
      const statuses: SyncStatus[] = ['online', 'offline', 'lan']
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
      if (Math.random() > 0.95) {
        setSyncStatus(randomStatus)
      }
    }, 15000)

    // Simular actualización de ancho de banda
    const bandwidthInterval = setInterval(() => {
      if (syncStatus === 'online' && isSyncing) {
        setBandwidth({
          upload: Math.max(0.5, Math.random() * 2.5),
          download: Math.max(0.3, Math.random() * 2)
        })
      }
    }, 3000)

    return () => {
      clearInterval(timeInterval)
      clearInterval(statusInterval)
      clearInterval(bandwidthInterval)
    }
  }, [syncStatus, isSyncing])

  const handleSyncNow = () => {
    setIsSyncing(true)
    setLastSync(new Date().toISOString())
    
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
      case 'online': return 'text-emerald-400'
      case 'offline': return 'text-gray-400'
      case 'lan': return 'text-[#08557f]'
    }
  }

  const getStatusBgColor = (status: SyncStatus) => {
    switch (status) {
      case 'online': return 'bg-emerald-400/10'
      case 'offline': return 'bg-gray-400/10'
      case 'lan': return 'bg-[#08557f]/10'
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
      case 'pending': return 'text-amber-400'
      case 'syncing': return 'text-[#08557f]'
      case 'completed': return 'text-emerald-400'
      case 'failed': return 'text-rose-400'
      case 'conflict': return 'text-[#fb851b]'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    if (!mounted || !dateString) return ''
    
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
        
        {/* Acentos de color sutiles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#08557f]/[0.015] to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#fb851b]/[0.01] to-transparent"></div>
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
                      alt="CrediFinanzas"
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
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
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
                <div className="p-4 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Base Local</span>
                  </div>
                  <div className="text-2xl font-light text-gray-800">
                    {transactions.length}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">transacciones</div>
                </div>
                
                <div className="p-4 bg-gray-50/50 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <UploadCloud className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Subida</span>
                  </div>
                  <div className="text-2xl font-light text-gray-800">
                    {bandwidth.upload.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Mbps</div>
                </div>
                
                <div className="p-4 bg-gray-50/50 rounded-lg">
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
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
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
                      
                      <div className="p-3 hover:bg-gray-50/50 rounded-lg transition-colors duration-300">
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
                                  transaction.priority === 'high' ? 'bg-rose-400/10 text-rose-600' :
                                  transaction.priority === 'normal' ? 'bg-amber-400/10 text-amber-600' :
                                  'bg-gray-400/10 text-gray-600'
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
                                  {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString('es-ES', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
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
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-[#fb851b]/10">
                      <AlertTriangle className="w-5 h-5 text-[#fb851b]" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium text-gray-800">
                        Conflictos Detectados
                      </h2>
                      <p className="text-sm text-gray-500">
                        Diferencias entre versiones locales y remotas
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'conflicts' ? 'status' : 'conflicts')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedSection === 'conflicts' ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
                
                {expandedSection === 'conflicts' && (
                  <div className="space-y-3 pt-4 border-t border-gray-200/30">
                    {conflicts.map((conflict) => (
                      <div
                        key={conflict.id}
                        className="p-4 bg-amber-50/30 border border-amber-200/30 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-800">
                                {conflict.id}
                              </span>
                              <span className="text-xs text-gray-500">
                                • {conflict.transactionId}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                              {conflict.description}
                            </p>
                            
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className="text-xs font-medium text-[#08557f]">
                                  {conflict.localVersion}
                                </div>
                                <div className="text-xs text-gray-400">→</div>
                                <div className="text-xs font-medium text-gray-600">
                                  {conflict.serverVersion}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {conflict.resolved === 'pending' && (
                            <div className="flex flex-col space-y-2">
                              <button
                                onClick={() => handleResolveConflict(conflict.id, 'resolved')}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                Usar remoto
                              </button>
                              <button
                                onClick={() => handleResolveConflict(conflict.id, 'ignored')}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Mantener local
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer minimalista */}
        <div className="mt-8 pt-6 border-t border-gray-200/30">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Server className="w-3.5 h-3.5" />
                <span>Sistema de sincronización activo</span>
              </div>
              <div className="text-gray-300">•</div>
              <span>v2.0.1 • Construido 2026.01</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span>Servidor respondiendo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de sincronización flotante */}
      {isSyncing && (
        <div className="fixed bottom-8 right-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#08557f] to-[#063a58] rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg">
              <RefreshCw className="w-5 h-5 text-[#08557f] animate-spin" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncStatusPage