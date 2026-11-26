'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  WifiOff,
  RefreshCw,
  CloudUpload,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { syncManager } from '@/lib/offline/syncManager';
import { useOffline } from '@/hooks/useOffline';
import { useAutoSync } from '@/hooks/use-auto-sync';
import { offlineQueue } from '@/lib/offline/offlineQueue';
import { OfflineQueueItem } from '@/lib/offline/offlineDb';

/**
 * Una actividad de sincronizacion efimera.
 *
 * La emite `logSyncActivity` por el evento `offline-activity` (offlineQueue.ts:257-267)
 * y NO es un item de la cola: trae solo estos cuatro campos. Se mezcla con los items de
 * la cola en la lista que se pinta, asi que esa lista es de los dos tipos.
 */
type ActividadManual = {
  id: string;
  description: string;
  timestamp: string;
  status: OfflineQueueItem['status'];
};
import { hasValidOfflineSession, getOfflineSessionDaysRemaining, isSessionExpiringSoon } from '@/lib/auth/offlineAuth';
import Tooltip from '@/components/ui/Tooltip';
import AyudaContextual from '@/components/ui/AyudaContextual'

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
  const [queueItems, setQueueItems] = useState<Array<OfflineQueueItem | ActividadManual>>([]);
  const [showResult, setShowResult] = useState(false);
  const [hasOfflineSession, setHasOfflineSession] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const [manualActivities, setManualActivities] = useState<ActividadManual[]>([]);

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
  const activeManualActivities = manualActivities.filter((activity) => {
    return !isCompletedStatus(activity?.status);
  });

  const completedManualActivities = manualActivities.filter((activity) => {
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

/**
 * El aspecto de cada estado, en el lenguaje del resto del sistema.
 *
 * ── Lo que habia ───────────────────────────────────────────────────────────
 *
 * Seis estados, y cada uno con TRECE clases escritas a mano: `panelTint`,
 * `halo`, `ring`, `border`, `chip`, `iconText`, `titleText`,
 * `descriptionText`, `metricText`... La capsula se dibujaba con cristal
 * esmerilado -`backdrop-blur-[42px]`, `saturate-2.2`-, tres halos borrosos,
 * doble borde, esquinas de 2rem y sombras de 90 px, encima de una interfaz
 * que es blanca y plana.
 *
 * El dueño lo dijo corto: «me parece feo la verdad». Y ademas del aspecto
 * traia dos problemas: el texto quedaba sobre un panel translucido, asi que
 * su contraste dependia de lo que hubiera detras; y setenta y ocho clases de
 * color escritas a mano divergen solas, que es lo que ya paso con los
 * distintivos de riesgo.
 *
 * ── Lo que hay ahora ───────────────────────────────────────────────────────
 *
 * Una tarjeta solida, como `PanelDeError` o `AvisoActualizando`: fondo
 * blanco, un borde de 1 px, sombra corta y UN color por estado, el del punto
 * y el del distintivo. Cuatro campos en vez de trece.
 */
const TONOS = {
  sinConexion: {
    punto: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    icono: 'text-slate-500',
    borde: 'border-slate-200',
  },
  servidor: {
    punto: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    icono: 'text-amber-600',
    borde: 'border-amber-200',
  },
  error: {
    punto: 'bg-rose-500',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    icono: 'text-rose-600',
    borde: 'border-rose-200',
  },
  sincronizando: {
    punto: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-800 border-sky-200',
    icono: 'text-sky-600',
    borde: 'border-sky-200',
  },
  pendiente: {
    punto: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    icono: 'text-amber-600',
    borde: 'border-amber-200',
  },
  estable: {
    punto: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icono: 'text-emerald-600',
    borde: 'border-emerald-200',
  },
} as const

  const syncTone = useMemo(() => {
    if (!browserOnline) {
      return {
        ...TONOS.sinConexion,
        label: 'Sin conexión',
        shortLabel: 'Offline',
        description:
          'Los cambios se guardarán localmente hasta recuperar conexión.',
        icon: WifiOff,
      }
    }

    if (browserOnline && !backendReachable) {
      return {
        ...TONOS.servidor,
        label: 'Servidor no disponible',
        shortLabel: 'Sin respuesta',
        description:
          'Tienes conexión, pero el servidor no respondió. Lo que hagas se guarda aquí y sube solo.',
        icon: AlertTriangle,
      }
    }

    if (failedOps > 0) {
      return {
        ...TONOS.error,
        label: 'Sincronización con errores',
        shortLabel: 'Con errores',
        description: `${failedOps} operación${failedOps === 1 ? '' : 'es'} requiere${failedOps === 1 ? '' : 'n'} atención.`,
        icon: AlertTriangle,
      }
    }

    if (isSyncingVisible) {
      return {
        ...TONOS.sincronizando,
        label: 'Sincronizando',
        shortLabel: 'Enviando',
        description: 'Estamos enviando los cambios pendientes.',
        icon: RefreshCw,
      }
    }

    if (pendingOps > 0 || activeManualActivities.length > 0) {
      return {
        ...TONOS.pendiente,
        label: 'Cambios pendientes',
        shortLabel: `${pendingOps + activeManualActivities.length} pendientes`,
        description: 'Hay operaciones guardadas para sincronizar.',
        icon: CloudUpload,
      }
    }

    return {
      ...TONOS.estable,
      label: 'Todo al día',
      shortLabel: 'Al día',
      description: 'No queda nada por sincronizar.',
      icon: CheckCircle,
    }
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

    const handleManualActivity = (e: Event) => {
      const activity = (e as CustomEvent<ActividadManual>).detail;
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
      // Refrescar los elementos de la cola
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
  const visibleQueueItems = queueItems.filter((item) => {
    return !isCompletedStatus(item?.status);
  });

  // No mostrar nada si está online y no hay operaciones pendientes
  if (browserOnline && backendReachable && actionableOps === 0 && !isSyncingVisible && !showResult) {
    return null;
  }

  return (
    <>
      <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] w-[min(94vw,48rem)] -translate-x-1/2 pointer-events-none">
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

              <Tooltip texto="Cerrar resultado de sincronización">
                <button
                  type="button"
                  onClick={() => setShowResult(false)}
                  className="rounded-full p-1 text-slate-500 transition hover:bg-white/30 hover:text-slate-800"
                  aria-label="Cerrar resultado de sincronización"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Panel expandido */}
        {expanded && (
          <div
            className={`pointer-events-auto mb-2 overflow-hidden rounded-2xl border bg-white shadow-lg ring-1 ring-slate-900/5 animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none ${syncTone.borde}`}
          >
            <div className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                    <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${syncTone.punto}`} />
                    <StatusIcon className={`h-5 w-5 ${syncTone.icono} ${isSyncingVisible ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        Estado del sistema
                      </h3>

                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${syncTone.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${syncTone.punto}`} />
                        {syncTone.shortLabel}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-medium text-slate-600">
                      {syncTone.description}
                      {/* Que significa trabajar sin conexion, una vez y no en
                          cada mensaje de estado. */}
                      <AyudaContextual
                        ayuda="trabajoSinConexion"
                        de="trabajar sin conexión"
                        tamano="pequeno"
                      />
                    </p>
                  </div>
                </div>

                <Tooltip texto="Contraer estado del sistema">
                  <button
                    type="button"
                    onClick={handleExpand}
                    className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 transition hover:bg-white/30 hover:text-slate-800 md:static"
                    aria-label="Contraer estado del sistema"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </Tooltip>
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

              {/*
                Las cuatro cifras, planas y con el mismo peso.
                
                Antes cada una traia su propio fondo translucido y su borde de
                color, asi que competian entre si y con el titulo. Lo que
                importa de estas cifras es un cero o un numero: el color
                sobra, salvo en «Fallidos», que es lo unico que pide actuar.
              */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    etiqueta: 'Pendientes',
                    valor: pendingOps,
                    ayuda: 'pendienteDeEnviar' as const,
                    de: 'lo que está pendiente de enviar',
                    alerta: false,
                  },
                  {
                    etiqueta: 'Enviando',
                    valor: syncingOps,
                    ayuda: undefined,
                    de: undefined,
                    alerta: false,
                  },
                  {
                    etiqueta: 'Fallidos',
                    valor: failedOps,
                    // No hay ayuda escrita para esto todavia.
                    ayuda: undefined,
                    de: undefined,
                    alerta: failedOps > 0,
                  },
                  {
                    etiqueta: 'Manuales',
                    valor: activeManualActivities.length,
                    ayuda: undefined,
                    de: undefined,
                    alerta: false,
                  },
                ].map((m) => (
                  <div
                    key={m.etiqueta}
                    className={`rounded-xl border px-3 py-2.5 ${
                      m.alerta
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <p className="flex items-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {m.etiqueta}
                      {m.ayuda && (
                        <AyudaContextual
                          ayuda={m.ayuda}
                          de={m.de}
                          tamano="pequeno"
                        />
                      )}
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold tabular-nums ${
                        m.alerta ? 'text-rose-700' : 'text-slate-900'
                      }`}
                    >
                      {m.valor}
                    </p>
                  </div>
                ))}
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
                  {shouldShowClearAction && (
                    <AyudaContextual
                      ayuda="limpiarDatosLocales"
                      de="limpiar los datos de este teléfono"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/*
          La capsula: solida, compacta y legible.

          Era cristal esmerilado con `backdrop-blur-[42px]`, un halo borroso,
          una linea de brillo y una sombra de 55 px. Sobre una interfaz blanca
          y plana se veia sucia, y el texto quedaba sobre un fondo translucido
          -o sea que su contraste dependia de lo que hubiera detras-.
        */}
        <button
          type="button"
          onClick={handleExpand}
          aria-expanded={expanded}
          className={`pointer-events-auto mx-auto flex max-w-[min(94vw,28rem)] items-center gap-2 rounded-full border bg-white px-3.5 py-2 shadow-md ring-1 ring-slate-900/5 transition-colors duration-150 ease-out hover:bg-slate-50 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${syncTone.borde}`}
          aria-label={
            expanded ? 'Ocultar estado del sistema' : 'Mostrar estado del sistema'
          }
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${syncTone.punto}`} />

          <StatusIcon
            className={`h-4 w-4 shrink-0 ${syncTone.icono} ${
              isSyncingVisible ? 'animate-spin motion-reduce:animate-none' : ''
            }`}
          />

          <span className="max-w-[210px] truncate text-xs font-bold text-slate-800">
            {syncTone.label}
          </span>

          {actionableOps > 0 && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${syncTone.chip}`}
            >
              {actionableOps}
            </span>
          )}

          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
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
            Esta acción borra del teléfono los clientes, créditos, cuotas, rutas,
            productos, cajas y usuarios guardados, y vuelve a descargarlos del
            servidor. Lo que esté esperando a subir NO se pierde.
          </p>

          {/*
            * Sin conexión esto deja al cobrador tirado en la calle.
            *
            * `clearLocalData()` vacía la copia local y después recarga la
            * página; si no hay red, la descarga que debería reponerla no
            * ocurre y se queda sin clientes, sin créditos y sin cuotas, que es
            * justo lo que necesita para trabajar. El texto decía «forzará una
            * resincronización completa», y eso solo es verdad con señal.
            */}
          {!browserOnline || !backendReachable ? (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800">
              Ahora mismo no hay conexión, así que los datos no se podrían volver
              a descargar y te quedarías sin la ruta. Hazlo cuando tengas señal.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleClear}
              disabled={isClearing || !browserOnline || !backendReachable}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Limpiando...' : 'Limpiar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
