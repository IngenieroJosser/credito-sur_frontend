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
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { syncManager } from '@/lib/offline/syncManager';
import { useOffline } from '@/hooks/useOffline';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { OfflineQueueItem } from '@/lib/offline/offlineDb';
import { hasValidOfflineSession, getOfflineSessionDaysRemaining, isSessionExpiringSoon } from '@/lib/auth/offlineAuth';

export default function OfflineIndicator() {
  const { isOnline, pendingOps, failedOps, syncingOps, completedOps, isSyncing, syncNow, downloadForOffline, lastSyncResult } = useOffline();
  
  // Activar sincronización automática y polling cada 5 minutos
  useAutoSync(300000); 

  const [expanded, setExpanded] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [hasOfflineSession, setHasOfflineSession] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [manualActivities, setManualActivities] = useState<any[]>([]);

  const totalOps = pendingOps + failedOps + syncingOps + completedOps + manualActivities.length;

  // Refrescar items de la cola cuando hay cambios en los contadores o estado de sync
  useEffect(() => {
    const refreshItems = () => {
      offlineQueue.getAll().then(items => {
        // Combinar items de DB con actividades manuales efímeras
        const allItems = [...manualActivities, ...items];
        setQueueItems(allItems);
      });
    };

    if (expanded || totalOps > 0) {
      refreshItems();
    }

    const interval = setInterval(refreshItems, 1000); // Refresco rápido mientras hay ops

    const handleManualActivity = (e: any) => {
      const activity = e.detail;
      setManualActivities(prev => {
        // Evitar duplicados
        if (prev.find(a => a.description === activity.description && a.timestamp === activity.timestamp)) return prev;
        return [activity, ...prev];
      });
    };

    // Limpiar actividades manuales solo al volver a estar online y no haber nada pendiente
    if (isOnline && pendingOps === 0 && syncingOps === 0 && failedOps === 0 && manualActivities.length > 0) {
      const timer = setTimeout(() => {
        setManualActivities([]);
      }, 10000); // 10 segundos de cortesía tras estar totalmente sincronizado
      return () => clearTimeout(timer);
    }

    window.addEventListener('offline-queue-changed', refreshItems);
    window.addEventListener('offline-activity', handleManualActivity);
    
    return () => {
      window.removeEventListener('offline-queue-changed', refreshItems);
      window.removeEventListener('offline-activity', handleManualActivity);
      clearInterval(interval);
    };
  }, [expanded, totalOps, isSyncing, manualActivities, isOnline, pendingOps, syncingOps, failedOps]);

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

  const handleExpand = () => {
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

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await syncManager.clearLocalData();
      window.location.reload();
    } finally {
      setIsClearing(false);
      setIsClearModalOpen(false);
    }
  };

  // No mostrar nada si está online y no hay operaciones pendientes
  if (isOnline && totalOps === 0 && !isSyncing && !showResult) {
    return null;
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 max-w-md pointer-events-none">
      {/* Resultado de sync */}
      {showResult && lastSyncResult && (
        <div className="mb-2 rounded-2xl border border-white/20 bg-white/[0.075] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.24)] ring-1 ring-white/[0.10] backdrop-blur-[28px] backdrop-saturate-[1.8] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
          {/* Brillo líquido superior */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          {/* Capa de vidrio */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.24] via-white/[0.08] to-white/[0.02]" />
          {/* Borde interno */}
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.12]" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">
                Sync: {lastSyncResult.succeeded} OK, {lastSyncResult.failed} fallidos
              </span>
            </div>
            <button onClick={() => setShowResult(false)} className="p-1 hover:bg-white/20 rounded transition-colors">
              <X className="h-3 w-3 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Panel expandido */}
      {expanded && (
        <div className="mb-2 rounded-2xl border border-white/20 bg-white/[0.075] shadow-[0_24px_80px_rgba(15,23,42,0.24)] ring-1 ring-white/[0.10] backdrop-blur-[28px] backdrop-saturate-[1.8] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
          {/* Brillo líquido superior */}
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          {/* Capa de vidrio */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.24] via-white/[0.08] to-white/[0.02]" />
          {/* Reflejo diagonal */}
          <div className="pointer-events-none absolute -top-20 right-4 h-40 w-40 rounded-full bg-white/[0.18] blur-3xl" />
          {/* Borde interno */}
          <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.12]" />
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
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline || totalOps === 0}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                  title="Sincronizar ahora"
                >
                  <CloudUpload className={`h-3.5 w-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                </button>
                <button
                  onClick={() => setIsClearModalOpen(true)}
                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                  title="Limpiar cache local (Emergencia)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {queueItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No hay operaciones en cola</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {queueItems.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs transition-all animate-in fade-in slide-in-from-right-2 duration-300 ${
                      item.status === 'pending'
                        ? 'bg-amber-50 border-amber-100'
                        : item.status === 'syncing'
                        ? 'bg-blue-50 border-blue-100'
                        : item.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-rose-50 border-rose-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-0.5">
                          {item.status === 'completed' ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          ) : item.status === 'failed' ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                          ) : item.status === 'syncing' ? (
                            <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 leading-tight">
                            {item.description}
                          </p>
                          {item.lastError && (
                            <p className="text-[10px] text-rose-600 mt-1 font-medium bg-rose-100/30 p-1.5 rounded-md border border-rose-100/50 break-words">
                              {item.lastError}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter text-center ${
                            item.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : item.status === 'syncing'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.status === 'pending' ? 'Espera' : 
                           item.status === 'syncing' ? 'Envío' : 
                           item.status === 'completed' ? 'Listo' :
                           'Error'}
                        </span>
                        
                        <div className="flex items-center gap-1 justify-end">
                          {item.status === 'failed' && item.id && !item.id.startsWith('act-') && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await offlineQueue.updateStatus(item.id!, 'pending');
                                handleSync();
                              }}
                              className="p-1 hover:bg-white rounded transition-colors text-rose-600"
                              title="Reintentar ahora"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (item.id?.startsWith('act-')) {
                                setManualActivities(prev => prev.filter(a => a.id !== item.id));
                              } else if (item.id) {
                                await offlineQueue.remove(item.id);
                              }
                            }}
                            className="p-1 hover:bg-white rounded transition-colors text-slate-400 hover:text-rose-600"
                            title="Eliminar de la cola"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {queueItems.length > 15 && (
                  <p className="text-[10px] text-slate-400 text-center font-medium pt-1">+{queueItems.length - 15} operaciones más</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra principal */}
      <button
        onClick={handleExpand}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-[0_18px_45px_rgba(8,85,127,0.38)] border border-white/20 backdrop-blur-2xl transition-all duration-300 active:scale-95 pointer-events-auto ${
          !isOnline
            ? 'bg-slate-800/90 text-white'
            : failedOps > 0
            ? 'bg-rose-600/90 text-white'
            : pendingOps > 0
            ? 'bg-amber-500/90 text-white'
            : isSyncing
            ? 'bg-blue-600/90 text-white'
            : 'bg-emerald-600/90 text-white'
        }`}
      >
        {/* Brillo líquido superior */}
        <span className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        {/* Capa de vidrio */}
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        
        {/* Icono de estado */}
        <span className="relative z-10">
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
        </span>

        {/* Texto */}
        <span className="text-xs font-bold flex-1 text-left relative z-10">
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
          <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full relative z-10">
            {totalOps}
          </span>
        )}

        {/* Chevron */}
        <span className="relative z-10">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </span>
      </button>
    </div>
  );
}
