'use client'

import { useMemo, useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  History,
  MapPin,
  Receipt,
  Search,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ExportButton } from '@/components/ui/ExportButton'

type PeriodoRuta = 'DIA' | 'SEMANA' | 'MES'
type EstadoVisita = 'pendiente' | 'pagado' | 'en_mora' | 'ausente' | 'reprogramado'

interface VisitaRuta {
  id: string
  clienteId: string
  cliente: string
  direccion: string
  telefono: string
  horaSugerida: string
  montoCuota: number
  saldoTotal: number
  estado: EstadoVisita
  proximaVisita: string
  periodoRuta: PeriodoRuta
  prioridad: 'alta' | 'media' | 'baja'
}

function ReadonlyVisitaItem({
  visita,
  isSelected,
  onSelect,
  getEstadoClasses,
  getPrioridadColor,
}: {
  visita: VisitaRuta
  isSelected: boolean
  onSelect: (id: string) => void
  getEstadoClasses: (estado: EstadoVisita) => string
  getPrioridadColor: (prioridad: 'alta' | 'media' | 'baja') => string
}) {
  return (
    <div
      className={`relative z-10 pointer-events-auto w-full rounded-2xl border px-4 py-3 transition-all ${
        isSelected
          ? 'border-[#08557f] bg-[#f7f7f7]'
          : 'border-slate-200 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex items-center">
          <div className="h-5 w-5 rounded-full border border-slate-200 bg-white" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">{visita.cliente}</div>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getPrioridadColor(visita.prioridad) }} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3" />
                <span>{visita.direccion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-slate-900">${visita.montoCuota.toLocaleString('es-CO')}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium leading-none text-slate-600 bg-slate-50">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{visita.horaSugerida}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEstadoClasses(visita.estado)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span className="capitalize">
                {visita.estado === 'pendiente' && 'Pendiente'}
                {visita.estado === 'pagado' && 'Pagado'}
                {visita.estado === 'en_mora' && 'En mora'}
                {visita.estado === 'ausente' && 'Ausente'}
                {visita.estado === 'reprogramado' && 'Reprogramado'}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onSelect(visita.id)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isSelected && 'rotate-90')} />
            </button>
          </div>

          {isSelected && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Saldo total:</span>
                  <span className="font-bold">${visita.saldoTotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Próxima visita:</span>
                  <span className="font-medium">{visita.proximaVisita}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Teléfono:</span>
                  <span className="font-medium">{visita.telefono}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  href={`/supervisor/clientes/${visita.clienteId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200"
                >
                  Ver cliente
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IconWrapper({ children }: { children: ReactNode }) {
  return <div className="p-2 rounded-lg bg-slate-100">{children}</div>
}

const DetalleRutaSupervisorPage = () => {
  const params = useParams()
  const router = useRouter()
  const rutaId = params?.id ? decodeURIComponent(params.id as string) : 'Desconocida'

  const [visitaSeleccionada, setVisitaSeleccionada] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [periodoRutaFiltro, setPeriodoRutaFiltro] = useState<PeriodoRuta | 'TODOS'>('TODOS')

  const cobrador = useMemo(() => {
    const mapa: Record<string, { nombres: string; apellidos: string; ruta: string }> = {
      '1': { nombres: 'Carlos', apellidos: 'Pérez', ruta: 'Ruta Centro' },
      '2': { nombres: 'María', apellidos: 'Rodríguez', ruta: 'Ruta Norte' },
      '3': { nombres: 'Pedro', apellidos: 'Gómez', ruta: 'Ruta Sur' },
    }
    return mapa[rutaId] ?? { nombres: 'Cobrador', apellidos: 'Asignado', ruta: `Ruta ${rutaId}` }
  }, [rutaId])

  const generarAvatar = (nombres: string, apellidos: string) => {
    return (nombres.charAt(0) + (apellidos?.charAt(0) || '')).toUpperCase()
  }

  const visitasBase: VisitaRuta[] = useMemo(
    () => [
      {
        id: 'V-001',
        clienteId: '1',
        cliente: 'Carlos Rodríguez',
        direccion: 'Av. Principal #123',
        telefono: '3001234567',
        horaSugerida: '09:30',
        montoCuota: 125000,
        saldoTotal: 500000,
        estado: 'pendiente',
        proximaVisita: 'Hoy',
        periodoRuta: 'DIA',
        prioridad: 'alta',
      },
      {
        id: 'V-002',
        clienteId: '2',
        cliente: 'Ana Martínez',
        direccion: 'Calle 45, Urbanización Norte',
        telefono: '3109876543',
        horaSugerida: '10:15',
        montoCuota: 80000,
        saldoTotal: 320000,
        estado: 'en_mora',
        proximaVisita: 'Hoy',
        periodoRuta: 'DIA',
        prioridad: 'alta',
      },
      {
        id: 'V-003',
        clienteId: '3',
        cliente: 'Luis Fernández',
        direccion: 'Conjunto Residencial Vista Azul',
        telefono: '3205551234',
        horaSugerida: '11:00',
        montoCuota: 95750,
        saldoTotal: 382000,
        estado: 'reprogramado',
        proximaVisita: 'Mañana',
        periodoRuta: 'SEMANA',
        prioridad: 'media',
      },
      {
        id: 'V-004',
        clienteId: '4',
        cliente: 'María González',
        direccion: 'Diagonal 56 #78-90',
        telefono: '3157778888',
        horaSugerida: '13:45',
        montoCuota: 110000,
        saldoTotal: 440000,
        estado: 'pagado',
        proximaVisita: '15/01',
        periodoRuta: 'MES',
        prioridad: 'baja',
      },
      {
        id: 'V-005',
        clienteId: '1',
        cliente: 'José Pérez',
        direccion: 'Avenida 7 #23-45',
        telefono: '3004445555',
        horaSugerida: '14:30',
        montoCuota: 95000,
        saldoTotal: 380000,
        estado: 'ausente',
        proximaVisita: 'Mañana',
        periodoRuta: 'MES',
        prioridad: 'media',
      },
    ],
    [],
  )

  const visitasFiltradas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return visitasBase
    return visitasBase.filter((v) => v.cliente.toLowerCase().includes(q) || v.direccion.toLowerCase().includes(q))
  }, [searchQuery, visitasBase])

  const cajaRuta = useMemo(
    () => ({
      recaudoTotal: 1540000,
      gastosOperativos: 47000,
    }),
    [],
  )

  const exportarRutaCSV = () => {
    const filas = visitasFiltradas
      .filter((v) => v.periodoRuta === 'DIA')
      .map((v) => [v.id, v.cliente, v.telefono, v.direccion, v.horaSugerida, v.estado, v.montoCuota].join(','))

    const header = ['id', 'cliente', 'telefono', 'direccion', 'hora', 'estado', 'monto'].join(',')
    const csv = [header, ...filas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ruta-${rutaId}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportarRutaPDF = () => {
    const data = visitasFiltradas.filter((v) => v.periodoRuta === 'DIA')
    const rows = data
      .map(
        (v) => `
          <tr>
            <td>${v.id}</td>
            <td>${v.cliente}</td>
            <td>${v.telefono}</td>
            <td>${v.direccion}</td>
            <td>${v.horaSugerida}</td>
            <td>${v.estado}</td>
            <td style="text-align:right;">${formatCurrency(v.montoCuota)}</td>
          </tr>
        `,
      )
      .join('')

    const html = `
      <html>
        <head>
          <title>Ruta diaria</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Ruta diaria</h1>
          <div class="sub">${new Date().toISOString().slice(0, 10)} • ${data.length} visitas</div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `

    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  const getEstadoClasses = (estado: EstadoVisita) => {
    switch (estado) {
      case 'pagado':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'
      case 'en_mora':
        return 'border-rose-200 bg-rose-50 text-rose-700'
      case 'reprogramado':
        return 'border-amber-200 bg-amber-50 text-amber-700'
      case 'ausente':
        return 'border-slate-200 bg-slate-50 text-slate-600'
      case 'pendiente':
      default:
        return 'border-slate-200 bg-white text-slate-700'
    }
  }

  const getPrioridadColor = (prioridad: 'alta' | 'media' | 'baja') => {
    if (prioridad === 'alta') return '#ef4444'
    if (prioridad === 'media') return '#fb851b'
    return '#10b981'
  }

  const noPagadas = visitasFiltradas.filter((v) => v.estado !== 'pagado')
  const pagadas = visitasFiltradas.filter((v) => v.estado === 'pagado')

  const porPeriodo = {
    DIA: noPagadas.filter((v) => v.periodoRuta === 'DIA'),
    SEMANA: noPagadas.filter((v) => v.periodoRuta === 'SEMANA'),
    MES: noPagadas.filter((v) => v.periodoRuta === 'MES'),
  }

  const renderSeccion = (titulo: string, visitas: VisitaRuta[]) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          {titulo}
        </div>
        <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">{visitas.length}</div>
      </div>
      {visitas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-6 text-sm text-slate-500">Sin visitas</div>
      ) : (
        <div className="space-y-3">
          {visitas.map((visita) => (
            <ReadonlyVisitaItem
              key={visita.id}
              visita={visita}
              isSelected={visitaSeleccionada === visita.id}
              onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
              getEstadoClasses={getEstadoClasses}
              getPrioridadColor={getPrioridadColor}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,#08557f_0,transparent_100%)] opacity-20"></div>
      </div>

      <div className="relative w-full space-y-8 p-8">
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-bold text-slate-700">
          Modo observación: no se pueden realizar modificaciones en la ruta.
        </div>

        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-[#08557f] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#08557f]/20">
                  {generarAvatar(cobrador.nombres, cobrador.apellidos)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {cobrador.nombres} {cobrador.apellidos}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Cobrador</span>
                  <span>•</span>
                  <span>{cobrador.ruta}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                Volver
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <IconWrapper>
                <DollarSign className="h-5 w-5 text-slate-900" />
              </IconWrapper>
              <span className="text-sm font-bold text-slate-600">Mi Recaudo</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">${cajaRuta.recaudoTotal.toLocaleString('es-CO')}</div>
          </div>

          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-bold text-slate-600">Gastos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">${cajaRuta.gastosOperativos.toLocaleString('es-CO')}</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Registrados hoy</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente, dirección..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#08557f]/20 focus:border-[#08557f] shadow-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                    showFilters ? 'bg-[#08557f] text-white border-[#08557f]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </button>

                <ExportButton label="Exportar Ruta" onExportExcel={exportarRutaCSV} onExportPDF={exportarRutaPDF} />

                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`px-4 py-2 border rounded-xl flex items-center gap-2 font-medium shadow-sm transition-colors ${
                    showHistory ? 'bg-[#08557f] text-white border-[#08557f]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span className="hidden md:inline">{showHistory ? 'Ver Ruta' : 'Historial'}</span>
                </button>
              </div>
            </div>

            {showFilters && !showHistory && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período de ruta</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(
                      [
                        { key: 'TODOS' as const, label: 'Día / Semana / Mes' },
                        { key: 'DIA' as const, label: 'Día' },
                        { key: 'SEMANA' as const, label: 'Semana' },
                        { key: 'MES' as const, label: 'Mes' },
                      ]
                    ).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setPeriodoRutaFiltro(item.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                          periodoRutaFiltro === item.key
                            ? 'bg-[#08557f] text-white border-[#08557f] shadow-lg shadow-[#08557f]/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-6">
              {(() => {
                if (showHistory) {
                  return (
                    <div className="space-y-3">
                      {visitasFiltradas.map((visita) => (
                        <ReadonlyVisitaItem
                          key={visita.id}
                          visita={visita}
                          isSelected={visitaSeleccionada === visita.id}
                          onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                          getEstadoClasses={getEstadoClasses}
                          getPrioridadColor={getPrioridadColor}
                        />
                      ))}
                    </div>
                  )
                }

                if (periodoRutaFiltro === 'DIA') return renderSeccion('Ruta del día', porPeriodo.DIA)
                if (periodoRutaFiltro === 'SEMANA') return renderSeccion('Ruta de la semana', porPeriodo.SEMANA)
                if (periodoRutaFiltro === 'MES') return renderSeccion('Ruta del mes', porPeriodo.MES)

                return (
                  <>
                    {renderSeccion('Ruta del día', porPeriodo.DIA)}
                    {renderSeccion('Ruta de la semana', porPeriodo.SEMANA)}
                    {renderSeccion('Ruta del mes', porPeriodo.MES)}
                  </>
                )
              })()}

              {pagadas.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4 opacity-50">
                    <CheckCircle2 className="h-5 w-5" />
                    Completadas
                  </h3>
                  <div className="relative z-10 pointer-events-auto space-y-3 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    {pagadas.map((visita) => (
                      <ReadonlyVisitaItem
                        key={visita.id}
                        visita={visita}
                        isSelected={visitaSeleccionada === visita.id}
                        onSelect={(id) => setVisitaSeleccionada(id === visitaSeleccionada ? null : id)}
                        getEstadoClasses={getEstadoClasses}
                        getPrioridadColor={getPrioridadColor}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetalleRutaSupervisorPage
