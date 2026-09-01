'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, Cloud, RefreshCw, HardDrive, ShieldCheck, Clock, Download } from 'lucide-react'
import { apiRequest } from '@/lib/api/api'
import { exportService } from '@/services/export-service'

type BackupEstado = 'EXITOSO' | 'FALLIDO' | 'EN_PROCESO'
type BackupTipo = 'MANUAL' | 'PROGRAMADO'

type BackupRun = {
  id: string
  tipo: BackupTipo
  destino: 'LOCAL'
  estado: BackupEstado
  filePath?: string | null
  fileSize?: number | null
  startedAt: string
  finishedAt?: string | null
  durationMs?: number | null
  error?: string | null
}

const BackupsSistemaPage = () => {

  const [status, setStatus] = useState<{ lastRun: BackupRun | null } | null>(null)
  const [history, setHistory] = useState<BackupRun[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [integrity, setIntegrity] = useState<{ todoEnOrden: boolean; problemas: string[]; revisadoEn?: string } | null>(null)

  const lastRun = status?.lastRun ?? null

  const formatBytes = useCallback((bytes?: number | null) => {
    if (!bytes || bytes <= 0) return null
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }, [])

  const formatDateTime = useCallback((iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }, [])

  const lastRunLabel = useMemo(() => {
    if (!lastRun) return 'Sin respaldos'
    const t = lastRun.finishedAt || lastRun.startedAt
    return formatDateTime(t)
  }, [formatDateTime, lastRun])

  const lastRunSize = useMemo(() => formatBytes(lastRun?.fileSize), [formatBytes, lastRun?.fileSize])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, h] = await Promise.all([
        apiRequest<{ lastRun: BackupRun | null }>('GET', '/backup/status', undefined, { cacheTTL: 0 }),
        apiRequest<{ items: BackupRun[] }>('GET', '/backup/history', undefined, { cacheTTL: 0, params: { limit: 20 } }),
      ])
      setStatus(s || null)
      setHistory(Array.isArray(h?.items) ? h.items : [])
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el estado de backups')
      setStatus(null)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  const pageSize = 5
  const totalPages = useMemo(() => {
    const total = history.length
    return Math.max(1, Math.ceil(total / pageSize))
  }, [history.length])

  const pagedHistory = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages)
    const start = (safePage - 1) * pageSize
    return history.slice(start, start + pageSize)
  }, [history, page, totalPages])

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadAll, 30_000)
    return () => clearInterval(interval)
  }, [loadAll])

  useEffect(() => {
    setPage(1)
  }, [history.length])

  const downloadArtifact = useCallback(async (id: string, type: 'dump' | 'xlsx') => {
    const ext = type === 'xlsx' ? 'xlsx' : 'dump'
    setError(null)
    try {
      await exportService.downloadFile(`backup/${id}/download`, { type }, `backup_${id}.${ext}`)
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404) {
        setError(
          type === 'dump'
            ? 'El dump no está disponible. Para descargarlo, el servidor debe tener pg_dump configurado y el backup debe generar el archivo.'
            : 'El Excel no está disponible. Si el backup está EN_PROCESO espera a que termine; si falla, revisa el detalle del error y vuelve a ejecutar.',
        )
        return
      }
      setError(e?.message || 'No se pudo descargar el archivo')
    }
  }, [])

  const runBackup = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      await apiRequest('POST', '/backup/run', undefined, { cacheTTL: 0, timeout: 15 * 60 * 1000 })
      await loadAll()
    } catch (e: any) {
      setError(e?.message || 'No se pudo ejecutar el backup')
    } finally {
      setRunning(false)
    }
  }, [loadAll])

  const verificarIntegridad = useCallback(async () => {
    setCheckingIntegrity(true)
    setError(null)
    try {
      const res = await apiRequest<{ todoEnOrden: boolean; problemas: string[]; revisadoEn: string }>(
        'GET',
        '/accounting/integridad',
        undefined,
        { cacheTTL: 0 },
      )
      setIntegrity(res)
    } catch (e: any) {
      setError(e?.message || 'No se pudo verificar la integridad contable')
    } finally {
      setCheckingIntegrity(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/50 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
      </div>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto relative z-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 tracking-wide font-bold border border-slate-200 mb-2">
              <Database className="h-3.5 w-3.5" />
              <span>Gestión de backups</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-blue-600">Respaldo y </span><span className="text-orange-500">Recuperación</span>
            </h1>
          </div>
        </header>
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Servidor Local</h2>
                  <p className="text-xs text-slate-500 font-medium">Base de datos principal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-600">Activo</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Último respaldo</span>
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-bold text-slate-900">{loading ? 'Cargando...' : lastRunLabel}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  {lastRunSize ? `Tamaño: ${lastRunSize}` : 'Tamaño: —'}
                </div>
              </div>

              <button
                onClick={runBackup}
                disabled={running}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2 group/btn disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                {running ? 'Ejecutando...' : 'Forzar respaldo manual'}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Nube VPS</h2>
                  <p className="text-xs text-slate-500 font-medium">Respaldo remoto</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-600">Conectado</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Última sincronización</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold text-slate-900">{loading ? 'Cargando...' : lastRunLabel}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  Estado: {lastRun?.estado ? lastRun.estado : '—'}
                </div>
              </div>

              <button
                onClick={verificarIntegridad}
                disabled={checkingIntegrity}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Cloud className={`h-4 w-4 ${checkingIntegrity ? 'animate-pulse' : ''}`} />
                {checkingIntegrity ? 'Verificando…' : 'Verificar integridad'}
              </button>

              {integrity && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    integrity.todoEnOrden
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {integrity.todoEnOrden ? (
                    <div className="font-bold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      <span>Contabilidad íntegra: el libro cuadra y las cajas coinciden.</span>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="font-bold mb-1">
                        Se encontraron {integrity.problemas.length} problema(s):
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 break-words">
                        {integrity.problemas.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla Historial - Desktop */}
        <section className="hidden md:block bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Historial de Operaciones</h3>
            <p className="text-sm text-slate-500 font-medium">Registro de las últimas actividades de respaldo.</p>
            {error && <p className="text-sm text-rose-600 font-bold mt-2">{error}</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">

              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Fecha</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Tipo</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Destino</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Estado</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Descargas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedHistory.map((r) => {
                  const estadoClass =
                    r.estado === 'EXITOSO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : r.estado === 'FALLIDO'
                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                  const tipoLabel = r.tipo === 'MANUAL' ? 'Manual' : 'Programado'
                  const canDownloadDump = r.estado === 'EXITOSO'
                  const canDownloadExcel = r.estado !== 'EN_PROCESO'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{formatDateTime(r.finishedAt || r.startedAt)}</td>
                      <td className="px-6 py-4 text-slate-600">{tipoLabel}</td>
                      <td className="px-6 py-4 text-slate-600">Local</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${estadoClass}`}>{r.estado}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadArtifact(r.id, 'dump')}
                            disabled={!canDownloadDump}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Dump
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadArtifact(r.id, 'xlsx')}
                            disabled={!canDownloadExcel}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400 font-bold">Sin historial</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && history.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Página {Math.min(page, totalPages)} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Vista de Cards - Móvil */}
        <section className="md:hidden space-y-4">

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4">
            <h3 className="text-base font-bold text-slate-900 mb-1">Historial de Operaciones</h3>
            <p className="text-xs text-slate-500 font-medium">Registro de las últimas actividades de respaldo.</p>
          </div>

          {error && (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 text-sm font-bold text-rose-600">
              {error}
            </div>
          )}

          {pagedHistory.map((r) => {
            const estadoClass =
              r.estado === 'EXITOSO'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : r.estado === 'FALLIDO'
                  ? 'bg-rose-50 text-rose-700 border-rose-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
            const tipoLabel = r.tipo === 'MANUAL' ? 'Manual' : 'Programado'
            const canDownloadDump = r.estado === 'EXITOSO'
            const canDownloadExcel = r.estado !== 'EN_PROCESO'

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Fecha</div>
                    <div className="font-bold text-slate-900">{formatDateTime(r.finishedAt || r.startedAt)}</div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${estadoClass}`}>{r.estado}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Tipo</div>
                    <div className="text-sm font-medium text-slate-600">{tipoLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Destino</div>
                    <div className="text-sm font-medium text-slate-600">Local</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadArtifact(r.id, 'dump')}
                    disabled={!canDownloadDump}
                    className="py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                  >
                    <Download className="h-4 w-4" />
                    Dump
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadArtifact(r.id, 'xlsx')}
                    disabled={!canDownloadExcel}
                    className="py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                  >
                    <Download className="h-4 w-4" />
                    Excel
                  </button>
                </div>
              </div>
            )
          })}

          {!loading && history.length === 0 && (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 text-center text-sm font-bold text-slate-400">
              Sin historial
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Página {Math.min(page, totalPages)} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default BackupsSistemaPage