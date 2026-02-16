'use client';

import { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CloudUpload,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Clock,
} from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { OfflineQueueItem } from '@/lib/offline/offlineDb';
import { hasValidOfflineSession, getOfflineSessionDaysRemaining, isSessionExpiringSoon } from '@/lib/auth/offlineAuth';

export default function OfflineIndicator() {
  const { isOnline, pendingOps, failedOps, isSyncing, syncNow, downloadForOffline, lastSyncResult } = useOffline();
  const [expanded, setExpanded] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [hasOfflineSession, setHasOfflineSession] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  const totalOps = pendingOps + failedOps;

  // Verificar sesión offline periódicamente
  useEffect(() => {
    const checkSession = () => {
      setHasOfflineSession(hasValidOfflineSession());
      setDaysRemaining(getOfflineSessionDaysRemaining());
      setIsExpiringSoon(isSessionExpiringSoon());
    };

    checkSession();
    const interval = setInterval(checkSession, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, []);

  const handleExpand = async () => {
    if (!expanded) {
      const items = await offlineQueue.getAll();
      setQueueItems(items);
    }
    setExpanded(!expanded);
  };

  const handleSync = async () => {
    const result = await syncNow();
    if (result) {
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
      // Refresh queue items
      const items = await offlineQueue.getAll();
      setQueueItems(items);
    }
  };

  const handleDownload = async () => {
    const result = await downloadForOffline();
    if (result) {
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    }
  };

  // No mostrar nada si está online y no hay operaciones pendientes
  if (isOnline && totalOps === 0 && !isSyncing && !showResult) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Resultado de sync */}
      {showResult && lastSyncResult && (
        <div className="mb-2 bg-white rounded-xl border border-slate-200 shadow-lg p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">
                Sync: {lastSyncResult.succeeded} OK, {lastSyncResult.failed} fallidos
              </span>
            </div>
            <button onClick={() => setShowResult(false)} className="p-1 hover:bg-slate-100 rounded">
              <X className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Panel expandido */}
      {expanded && (
        <div className="mb-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Información de sesión offline */}
          {hasOfflineSession && (
            <div className={`p-3 border-b ${isExpiringSoon ? 'bg-amber-50 border-amber-100' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className={`h-3.5 w-3.5 ${isExpiringSoon ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-700">Sesión Offline</span>
                </div>
                <span className={`text-xs font-bold ${isExpiringSoon ? 'text-amber-600' : 'text-slate-600'}`}>
                  {daysRemaining} días restantes
                </span>
              </div>
              {isExpiringSoon && (
                <p className="text-[10px] text-amber-700 mt-1.5">
                  Conéctate a Internet pronto para renovar tu sesión offline
                </p>
              )}
            </div>
          )}

          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Cola de Sincronización</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={isSyncing || !isOnline}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  title="Descargar datos para offline"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline || totalOps === 0}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  title="Sincronizar ahora"
                >
                  <CloudUpload className={`h-3.5 w-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>

            {queueItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No hay operaciones en cola</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queueItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      item.status === 'pending'
                        ? 'bg-amber-50 border-amber-100'
                        : item.status === 'syncing'
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-rose-50 border-rose-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 truncate flex-1">{item.description}</span>
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : item.status === 'syncing'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.status === 'pending' ? 'Pendiente' : item.status === 'syncing' ? 'Enviando' : `Fallido (${item.retries})`}
                      </span>
                    </div>
                    {item.lastError && (
                      <p className="text-[10px] text-rose-600 mt-1 truncate">{item.lastError}</p>
                    )}
                  </div>
                ))}
                {queueItems.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-center">+{queueItems.length - 10} más</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra principal */}
      <button
        onClick={handleExpand}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all ${
          !isOnline
            ? 'bg-slate-800 border-slate-700 text-white'
            : failedOps > 0
            ? 'bg-rose-600 border-rose-500 text-white'
            : pendingOps > 0
            ? 'bg-amber-500 border-amber-400 text-white'
            : isSyncing
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-emerald-600 border-emerald-500 text-white'
        }`}
      >
        {/* Icono de estado */}
        {!isOnline ? (
          <WifiOff className="h-4 w-4 flex-shrink-0" />
        ) : isSyncing ? (
          <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
        ) : failedOps > 0 ? (
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        ) : pendingOps > 0 ? (
          <CloudUpload className="h-4 w-4 flex-shrink-0" />
        ) : (
          <Wifi className="h-4 w-4 flex-shrink-0" />
        )}

        {/* Texto */}
        <span className="text-xs font-bold flex-1 text-left">
          {!isOnline
            ? 'Sin conexión'
            : isSyncing
            ? 'Sincronizando...'
            : failedOps > 0
            ? `${failedOps} operación(es) fallida(s)`
            : pendingOps > 0
            ? `${pendingOps} pendiente(s) de sync`
            : 'Sincronizado'}
        </span>

        {/* Badge de conteo */}
        {totalOps > 0 && (
          <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {totalOps}
          </span>
        )}

        {/* Chevron */}
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
