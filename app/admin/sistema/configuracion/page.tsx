'use client'

import { SkeletonDetalle } from '@/components/ui/Skeleton'

import { useState, useEffect, useCallback } from 'react'
import { useRealtimeData } from '@/hooks/useRealtimeData'
import Link from 'next/link'
import { Settings, CreditCard, Bell, Shield, Users, Database, Wallet, Calculator, CheckCircle, ArrowRight } from 'lucide-react'
import { configuracionService, ConfiguracionSistema } from '@/services/configuracion-service'
import Tooltip from '@/components/ui/Tooltip'
import { apiRequest } from '@/lib/api/api'
import { Toaster, toast } from 'sonner'

const ConfiguracionSistemaPage = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfiguracionSistema>({
    id: 'default',
    autoAprobarClientes: false,
    autoAprobarCreditos: false,
  });

  const [respaldando, setRespaldando] = useState(false);

  // El botón "Realizar Respaldo Manual" no tenía onClick (no hacía nada).
  // Ahora dispara el mismo backup real que usa la pantalla de Backups.
  const realizarRespaldoManual = useCallback(async () => {
    setRespaldando(true);
    try {
      await apiRequest('POST', '/backup/run', undefined, {
        cacheTTL: 0,
        timeout: 15 * 60 * 1000,
      });
      toast.success('Respaldo generado correctamente');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo generar el respaldo');
    } finally {
      setRespaldando(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await configuracionService.getConfiguracion();
      setConfig(data);
    } catch (error) {
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  // Tiempo real: si otro superadmin cambia la config, se refleja aquí
  useRealtimeData(['dashboards_actualizados'], fetchConfig)

  const updateConfig = async (key: keyof ConfiguracionSistema, value: boolean | number) => {
    const originalConfig = { ...config };
    try {
      setConfig({ ...config, [key]: value });
      await configuracionService.updateConfiguracion({ [key]: value });
      toast.success('Configuración actualizada');
    } catch (error) {
      setConfig(originalConfig);
      toast.error('Error al actualizar la configuración');
    }
  };

  if (loading) {
    return (
      <SkeletonDetalle />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Toaster position="top-right" />
      {/* Fondo arquitectónico standard */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-slate-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="relative z-10 w-full p-8 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Settings className="h-3.5 w-3.5" />

              <span>Configuración general</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="text-blue-600">Parámetros del </span><span className="text-orange-500">Sistema</span>
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm max-w-2xl">
              Gestione las reglas de negocio, tasas de interés, configuraciones de notificaciones y permisos globales.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="shrink-0 p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Copias de Seguridad</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Respaldo y recuperación</p>
              </div>
            </div>

            <div className="space-y-4">
              {/*
                Decía "Frecuencia automática — Diario (23:00)" y no es verdad:
                el backend no tiene ningún @Cron de respaldo. El único camino es
                POST /backup/run, que el propio servicio llama
                `runManualBackup()`. Si nadie pulsa el botón, no hay copia.
              */}
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Respaldo Local</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Solo cuando se pide aquí</div>
                </div>
                <Tooltip texto="No hay respaldo programado: el sistema no genera copias por su cuenta. Cada copia se crea con el botón de abajo.">
                  <span
                    tabIndex={0}
                    className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-sm font-bold text-amber-700 shadow-sm cursor-help"
                  >
                    Manual
                  </span>
                </Tooltip>
              </div>

              {/*
                Aquí había un interruptor verde fijo, sin onClick y sin ningún
                campo detrás: se podía pulsar creyendo que se apagaba la réplica.
                La réplica SÍ existe (MirrorSyncModule copia cada cambio al VPS),
                pero no se enciende desde la pantalla: depende de MIRROR_SYNC_ENABLED,
                MIRROR_VPS_URL y MIRROR_SYNC_TOKEN en el servidor. Y tampoco es un
                respaldo: es una copia en vivo, fila a fila.

                Su estado de verdad ya lo muestra la pantalla de Sincronización
                (consulta /configuracion/colas/status), así que se enlaza en vez
                de repetir aquí esa consulta.
              */}
              <Link
                href="/sistema/sincronizacion"
                className="flex items-center justify-between gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors group/enlace"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Réplica en vivo (VPS)</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">
                    Se configura en el servidor, no desde aquí
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-slate-600 group-hover/enlace:text-slate-900">
                  Ver estado
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>

              <button
                onClick={realizarRespaldoManual}
                disabled={respaldando}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Database className={`h-4 w-4 ${respaldando ? 'animate-pulse' : ''}`} />
                {respaldando ? 'Generando respaldo…' : 'Realizar Respaldo Manual'}
              </button>
            </div>
          </section>

          {/* NUEVA SECCIÓN DE APROBACIONES */}
          <section className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="shrink-0 p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Aprobación de Solicitudes</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Auto-Aprobar Clientes y Créditos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Auto-Aprobar Clientes</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Bypass flujo de aprobación inicial</div>
                </div>
                <Tooltip texto="Los clientes nuevos entran aprobados, sin pasar por revision">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.autoAprobarClientes}
                    aria-label="Auto-aprobar clientes"
                    onClick={() => updateConfig('autoAprobarClientes', !config.autoAprobarClientes)}
                    className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.autoAprobarClientes ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'}`}
                  >
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${config.autoAprobarClientes ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </Tooltip>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900">Auto-Aprobar Créditos</div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">Aprobar préstamos automáticamente</div>
                </div>
                <Tooltip texto="Los creditos nuevos quedan aprobados sin que nadie los revise">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.autoAprobarCreditos}
                    aria-label="Auto-aprobar créditos"
                    onClick={() => updateConfig('autoAprobarCreditos', !config.autoAprobarCreditos)}
                    className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.autoAprobarCreditos ? 'bg-emerald-500 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'}`}
                  >
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${config.autoAprobarCreditos ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </Tooltip>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                 <div className="flex items-start gap-3">
                   <div className="mt-0.5">
                     <Bell className="h-4 w-4 text-blue-600" />
                   </div>
                   <p className="text-xs text-blue-800 font-medium leading-relaxed">
                     Habilite estas opciones temporalmente si va a realizar una carga masiva. Por razones de seguridad, se recomienda mantener la aprobación manual.
                   </p>
                 </div>
              </div>
            </div>
          </section>

          {/* Las secciones eliminadas estaban aquí */}
        </div>
      </div>
    </div>
  )
}

export default ConfiguracionSistemaPage