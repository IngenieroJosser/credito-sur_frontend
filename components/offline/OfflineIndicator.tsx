'use client';

import { useMemo, useState, useEffect } from 'react';
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
  const {
    browserOnline,
    backendReachable,
    pendingOps,
    failedOps,
    syncingOps,
    completedOps,
    isSyncing,
    syncNow,
    downloadForOffline,
    lastSyncResult,
  } = useOffline();
  
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

  const [eventSyncActive, setEventSyncActive] = useState(false);

  // Función auxiliar para verificar si un estado es completado
  const isCompletedStatus = (status: unknown) => {
    const normalized = String(status || '').toLowerCase();
    return [
      'completed',
      'complete',
      'success',
      'succeeded',
      'synced',
      'done',
    ].includes(normalized);
  };

  // Separar actividades activas de completadas
  const activeManualActivities = manualActivities.filter((activity: any) => {
    return !isCompletedStatus(activity?.status);
  });

  const completedManualActivities = manualActivities.filter((activity: any) => {
    return isCompletedStatus(activity?.status);
  });

  const actionableOps =
    Number(pendingOps || 0) +
    Number(failedOps || 0) +
    Number(syncingOps || 0) +
    activeManualActivities.length;

  const recentCompletedOps =
    Number(completedOps || 0) + completedManualActivities.length;

  const visibleOps = actionableOps + recentCompletedOps;

  const hasActiveSync = isSyncing || syncingOps > 0 || eventSyncActive;
  const isSyncingVisible = hasActiveSync;

  // Escuchar eventos de sincronización desde syncManager
  useEffect(() => {
    const handleSyncStarted = () => {
      setEventSyncActive(true);
      setShowResult(false);
    };

    const handleSyncFinished = () => {
      setEventSyncActive(false);
    };

    window.addEventListener('offline-sync-started', handleSyncStarted);
    window.addEventListener('offline-sync-finished', handleSyncFinished);

    return () => {
      window.removeEventListener('offline-sync-started', handleSyncStarted);
      window.removeEventListener('offline-sync-finished', handleSyncFinished);
    };
  }, []);

  const syncTone = useMemo(() => {
    if (!browserOnline) {
      return {
        label: 'Sin conexión',
        shortLabel: 'Offline',
        description: 'Los cambios se guardarán localmente hasta recuperar conexión.',
        icon: WifiOff,
        dot: 'bg-slate-300',
        iconText: 'text-slate-100',
        titleText: 'text-slate-950',
        descriptionText: 'text-slate-700',
        panelTint: 'from-slate-500/[0.24] via-white/[0.12] to-slate-900/[0.10]',
        halo: 'bg-slate-400/30',
        border: 'border-slate-300/40',
        ring: 'ring-slate-300/30',
        chip: 'border-slate-300/45 bg-slate-900/[0.18] text-slate-900',
        metricText: 'text-slate-900',
      };
    }

    if (browserOnline && !backendReachable) {
      return {
        label: 'Servidor no disponible',
        shortLabel: 'Backend',
        description: 'Tienes conexión, pero el servidor no respondió.',
        icon: AlertTriangle,
        dot: 'bg-orange-500',
        iconText: 'text-orange-500',
        titleText: 'text-orange-950',
        descriptionText: 'text-orange-800',
        panelTint: 'from-orange-500/[0.26] via-white/[0.13] to-orange-900/[0.10]',
        halo: 'bg-orange-400/35',
        border: 'border-orange-300/45',
        ring: 'ring-orange-300/35',
        chip: 'border-orange-300/50 bg-orange-500/[0.18] text-orange-950',
        metricText: 'text-orange-950',
      };
    }

    if (failedOps > 0) {
      return {
        label: 'Sincronización con errores',
        shortLabel: 'Error de sync',
        description: `${failedOps} operación${failedOps === 1 ? '' : 'es'} requiere${failedOps === 1 ? '' : 'n'} atención.`,
        icon: AlertTriangle,
        dot: 'bg-rose-500',
        iconText: 'text-rose-500',
        titleText: 'text-rose-950',
        descriptionText: 'text-rose-800',
        panelTint: 'from-rose-500/[0.26] via-white/[0.13] to-rose-900/[0.10]',
        halo: 'bg-rose-400/35',
        border: 'border-rose-300/45',
        ring: 'ring-rose-300/35',
        chip: 'border-rose-300/50 bg-rose-500/[0.18] text-rose-950',
        metricText: 'text-rose-950',
      };
    }

    if (isSyncingVisible) {
      return {
        label: 'Sincronizando',
        shortLabel: 'Sync activo',
        description: 'Estamos enviando los cambios pendientes.',
        icon: RefreshCw,
        dot: 'bg-sky-500',
        iconText: 'text-sky-500',
        titleText: 'text-sky-950',
        descriptionText: 'text-sky-800',
        panelTint: 'from-sky-500/[0.26] via-white/[0.13] to-blue-900/[0.10]',
        halo: 'bg-sky-400/35',
        border: 'border-sky-300/45',
        ring: 'ring-sky-300/35',
        chip: 'border-sky-300/50 bg-sky-500/[0.18] text-sky-950',
        metricText: 'text-sky-950',
      };
    }

    if (pendingOps > 0 || activeManualActivities.length > 0) {
      return {
        label: 'Cambios pendientes',
        shortLabel: `${pendingOps + activeManualActivities.length} pendientes`,
        description: 'Hay operaciones guardadas para sincronizar.',
        icon: CloudUpload,
        dot: 'bg-amber-500',
        iconText: 'text-amber-500',
        titleText: 'text-amber-950',
        descriptionText: 'text-amber-800',
        panelTint: 'from-amber-500/[0.28] via-white/[0.13] to-orange-900/[0.10]',
        halo: 'bg-amber-400/35',
        border: 'border-amber-300/50',
        ring: 'ring-amber-300/35',
        chip: 'border-amber-300/50 bg-amber-500/[0.20] text-amber-950',
        metricText: 'text-amber-950',
      };
    }

    return {
      label: 'Sincronización estable',
      shortLabel: 'Sistema estable',
      description: 'Todos los datos están al día.',
      icon: CheckCircle,
      dot: 'bg-emerald-500',
      iconText: 'text-emerald-500',
      titleText: 'text-emerald-950',
      descriptionText: 'text-emerald-800',
      panelTint: 'from-emerald-500/[0.26] via-white/[0.13] to-teal-900/[0.10]',
      halo: 'bg-emerald-400/35',
      border: 'border-emerald-300/45',
      ring: 'ring-emerald-300/35',
      chip: 'border-emerald-300/50 bg-emerald-500/[0.18] text-emerald-950',
      metricText: 'text-emerald-950',
    };
  }, [
    browserOnline,
    backendReachable,
    failedOps,
    isSyncingVisible,
    pendingOps,
    activeManualActivities.length,
  ]);

  const StatusIcon = syncTone.icon;

  const shouldShowSyncAction =
    browserOnline && backendReachable && actionableOps > 0 && !isSyncing;

  const shouldShowClearAction =
    failedOps > 0;

  // Refrescar items de la cola cuando hay cambios en los contadores o estado de sync
  useEffect(() => {
    const refreshItems = () => {
      offlineQueue.getAll().then(items => {
        // Combinar items de DB con actividades manuales efímeras
        const allItems = [...manualActivities, ...items];
        setQueueItems(allItems);
      });
    };

    if (expanded || visibleOps > 0) {
      refreshItems();
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    if (expanded || visibleOps > 0 || isSyncing) {
      interval = setInterval(refreshItems, 1000); // Refresco rápido mientras hay ops
    }

    const handleManualActivity = (e: any) => {
      const activity = e.detail;
      setManualActivities(prev => {
        // Evitar duplicados
        if (prev.find(a => a.description === activity.description && a.timestamp === activity.timestamp)) return prev;
        return [activity, ...prev];
      });
    };

    // Limpiar actividades manuales solo al volver a estar online y no haber nada pendiente
    if (browserOnline && pendingOps === 0 && syncingOps === 0 && failedOps === 0 && activeManualActivities.length === 0) {
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

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [expanded, visibleOps, isSyncing, manualActivities, browserOnline, pendingOps, syncingOps, failedOps]);

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

  // Filtrar items visibles (excluir completados)
  const visibleQueueItems = queueItems.filter((item: any) => {
    return !isCompletedStatus(item?.status);
  });

  // No mostrar nada si está online y no hay operaciones pendientes
  if (browserOnline && backendReachable && actionableOps === 0 && !isSyncingVisible && !showResult) {
    return null;
  }

  return (
    <>
      <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] w-[min(94vw,48rem)] -translate-x-1/2 pointer-events-none">
        {/* Resultado de sync */}
        {showResult && lastSyncResult && (
          <div className="relative mb-2 overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/[0.08] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-white/15 backdrop-blur-[34px] backdrop-saturate-[1.9] animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto">
            <div className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-gradient-to-br from-white/[0.28] via-white/[0.08] to-white/[0.02]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <div className="pointer-events-none absolute -top-20 right-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-800">
                  Sync: {lastSyncResult.succeeded} OK, {lastSyncResult.failed} fallidos
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowResult(false)}
                className="rounded-full p-1 text-slate-500 transition hover:bg-white/30 hover:text-slate-800"
                aria-label="Cerrar resultado de sincronización"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Panel expandido */}
        {expanded && (
          <div className={`relative mb-2 overflow-hidden rounded-[2rem] border ${syncTone.border} bg-white/[0.08] shadow-[0_28px_90px_rgba(15,23,42,0.24)] ring-1 ${syncTone.ring} backdrop-blur-[42px] backdrop-saturate-[2.2] animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto`}>
            <div className={`pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br ${syncTone.panelTint}`} />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
            <div className={`pointer-events-none absolute -top-20 left-8 h-44 w-44 rounded-full ${syncTone.halo} blur-3xl`} />
            <div className={`pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full ${syncTone.halo} blur-3xl`} />
            <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/25" />

            <div className="relative z-10 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.10] shadow-lg ${syncTone.halo}`}>
                    <div className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ${syncTone.dot} shadow-[0_0_18px_currentColor]`} />
                    <StatusIcon className={`h-5 w-5 ${syncTone.iconText} ${isSyncingVisible ? 'animate-spin' : ''}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-sm font-black ${syncTone.titleText}`}>
                        Estado del sistema
                      </h3>

                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${syncTone.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${syncTone.dot} shadow-[0_0_14px_currentColor]`} />
                        {syncTone.shortLabel}
                      </span>
                    </div>

                    <p className={`mt-1 text-xs font-semibold ${syncTone.descriptionText}`}>
                      {syncTone.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExpand}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-white/30 hover:text-slate-800 md:static"
                  aria-label="Contraer estado del sistema"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              {hasOfflineSession && (
                <div className={`mt-4 rounded-2xl border px-3 py-2.5 ${
                  isExpiringSoon
                    ? 'border-amber-200/35 bg-amber-400/[0.08]'
                    : 'border-white/20 bg-white/[0.08]'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-3.5 w-3.5 ${isExpiringSoon ? 'text-amber-500' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-700">
                        Sesión offline
                      </span>
                    </div>
                  </div>

                  {isExpiringSoon && (
                    <p className="mt-1.5 text-[10px] font-medium text-amber-700">
                      Conéctate a Internet pronto para renovar tu sesión offline.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-4 gap-2">
                <div className={`rounded-2xl border ${syncTone.border} bg-white/[0.10] px-3 py-2.5`}>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                    Pendientes
                  </p>
                  <p className={`mt-1 text-lg font-black ${syncTone.metricText}`}>
                    {pendingOps}
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-300/45 bg-sky-500/[0.10] px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                    Sync
                  </p>
                  <p className="mt-1 text-lg font-black text-sky-700">
                    {syncingOps}
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-300/45 bg-rose-500/[0.10] px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">
                    Fallidos
                  </p>
                  <p className="mt-1 text-lg font-black text-rose-700">
                    {failedOps}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-300/45 bg-amber-500/[0.10] px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                    Manuales
                  </p>
                  <p className="mt-1 text-lg font-black text-amber-700">
                    {activeManualActivities.length}
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {visibleQueueItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-5 text-center">
                    <p className="text-xs font-bold text-slate-600">
                      No hay operaciones en cola
                    </p>
                  </div>
                ) : (
                  visibleQueueItems.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/20 bg-white/[0.09] px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          {item.status === 'completed' ? (
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : item.status === 'failed' ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                          ) : item.status === 'syncing' ? (
                            <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" />
                          ) : (
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {item.description}
                            </p>

                            {item.lastError && (
                              <p className="mt-1 line-clamp-2 rounded-xl border border-rose-200/30 bg-rose-400/[0.08] px-2 py-1 text-[10px] font-medium text-rose-700">
                                {item.lastError}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          item.status === 'pending'
                            ? 'bg-amber-400/10 text-amber-700'
                            : item.status === 'syncing'
                              ? 'bg-sky-400/10 text-sky-700'
                              : item.status === 'completed'
                                ? 'bg-emerald-400/10 text-emerald-700'
                                : 'bg-rose-400/10 text-rose-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {(shouldShowSyncAction || shouldShowClearAction) && (
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/15 pt-3">
                  {shouldShowSyncAction && (
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={isSyncing || !browserOnline || !backendReachable || actionableOps === 0}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/[0.12] px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-white/[0.22] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CloudUpload className={`h-3.5 w-3.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                      Sincronizar
                    </button>
                  )}

                  {shouldShowClearAction && (
                    <button
                      type="button"
                      onClick={() => setIsClearModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200/30 bg-rose-400/[0.08] px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-400/[0.14]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpiar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cápsula colapsada */}
        <button
          type="button"
          onClick={handleExpand}
          className={`pointer-events-auto relative mx-auto flex max-w-[min(94vw,28rem)] items-center gap-2 overflow-hidden rounded-full border ${syncTone.border} bg-white/[0.08] px-3.5 py-2.5 shadow-[0_18px_55px_rgba(15,23,42,0.22)] ring-1 ${syncTone.ring} backdrop-blur-[42px] backdrop-saturate-[2.2] transition-all duration-300 hover:scale-[1.015] hover:bg-white/[0.14] active:scale-[0.99]`}
          aria-label={expanded ? 'Ocultar estado del sistema' : 'Mostrar estado del sistema'}
        >
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${syncTone.panelTint}`} />
          <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
          <div className={`pointer-events-none absolute -right-6 -top-10 h-24 w-24 rounded-full ${syncTone.halo} blur-2xl`} />

          <span className={`relative z-10 h-2.5 w-2.5 rounded-full ${syncTone.dot} shadow-[0_0_16px_currentColor]`} />

          <StatusIcon className={`relative z-10 h-4 w-4 ${syncTone.iconText} ${isSyncingVisible ? 'animate-spin' : ''}`} />

          <span className={`relative z-10 max-w-[210px] truncate text-xs font-black ${syncTone.titleText}`}>
            {syncTone.label}
          </span>

          {actionableOps > 0 && (
            <span className={`relative z-10 rounded-full border px-2 py-0.5 text-[10px] font-black ${syncTone.chip}`}>
              {actionableOps}
            </span>
          )}

          {expanded ? (
            <ChevronUp className={`relative z-10 h-4 w-4 ${syncTone.iconText}`} />
          ) : (
            <ChevronDown className={`relative z-10 h-4 w-4 ${syncTone.iconText}`} />
          )}
        </button>
      </div>

      {/* Modal de limpiar caché */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Limpiar caché local"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Esta acción eliminará todos los datos locales y forzará una resincronización completa. Úsalo solo en casos de emergencia.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {isClearing ? 'Limpiando...' : 'Limpiar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
